/**
 * Voting service.
 *
 * Integrity rules are enforced in Postgres, not here:
 *  - one vote per member per proposal (primary key on votes),
 *  - votes only while the proposal is open and only by community members
 *    (can_vote() inside the RLS insert policy),
 *  - an append-only ledger (no update or delete grant or policy).
 * This service maps the results to HTTP responses.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOk, unwrap, unwrapMaybe } from "../../lib/db.ts";
import { httpErrors } from "../../lib/errors.ts";
import type { CastVoteInput, CreateProposalInput } from "./schemas.ts";

export interface Proposal {
  id: string;
  community_id: string;
  title: string;
  description: string;
  created_by: string | null;
  opens_at: string;
  closes_at: string;
  created_at: string;
}

export interface ProposalOption {
  id: string;
  proposal_id: string;
  label: string;
  sort_order: number;
}

export interface Tally {
  option_id: string;
  label: string;
  vote_count: number;
}

const PROPOSAL_COLUMNS =
  "id, community_id, title, description, created_by, opens_at, closes_at, created_at";

export async function listProposals(db: SupabaseClient, communityId: string): Promise<Proposal[]> {
  return unwrap(
    await db
      .from("proposals")
      .select(PROPOSAL_COLUMNS)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })
      .limit(100),
  );
}

export async function getProposal(
  db: SupabaseClient,
  proposalId: string,
): Promise<Proposal & { options: ProposalOption[] }> {
  const proposal = unwrap<Proposal>(
    await db.from("proposals").select(PROPOSAL_COLUMNS).eq("id", proposalId).maybeSingle(),
    "Proposal not found",
  );
  const options = unwrap<ProposalOption[]>(
    await db
      .from("proposal_options")
      .select("id, proposal_id, label, sort_order")
      .eq("proposal_id", proposalId)
      .order("sort_order", { ascending: true }),
  );
  return { ...proposal, options };
}

/**
 * Creates a proposal and its options in one transaction via the
 * create_proposal() RPC, which runs as the caller so RLS still applies.
 */
export async function createProposal(
  db: SupabaseClient,
  communityId: string,
  input: CreateProposalInput,
): Promise<string> {
  const res = await db.rpc("create_proposal", {
    p_community_id: communityId,
    p_title: input.title,
    p_description: input.description,
    p_opens_at: input.opens_at ?? new Date().toISOString(),
    p_closes_at: input.closes_at,
    p_options: input.options,
  });
  assertOk(res);
  if (typeof res.data !== "string") {
    throw httpErrors.badRequest("Proposal could not be created");
  }
  return res.data;
}

/**
 * Casts the caller's single vote. A duplicate is a 409 conflict. Voting on a
 * closed proposal, or without membership, fails RLS and becomes a 403.
 */
export async function castVote(
  db: SupabaseClient,
  userId: string,
  proposalId: string,
  input: CastVoteInput,
): Promise<{ proposal_id: string; option_id: string }> {
  const res = await db.from("votes").insert({
    proposal_id: proposalId,
    user_id: userId,
    option_id: input.option_id,
  });
  if (res.error) {
    if (res.error.code === "23505") {
      throw httpErrors.conflict("You have already voted on this proposal");
    }
    assertOk(res);
  }
  return { proposal_id: proposalId, option_id: input.option_id };
}

/** The caller's own vote on a proposal, or null if they have not voted. */
export async function getMyVote(
  db: SupabaseClient,
  userId: string,
  proposalId: string,
): Promise<{ option_id: string; cast_at: string } | null> {
  return unwrapMaybe(
    await db
      .from("votes")
      .select("option_id, cast_at")
      .eq("proposal_id", proposalId)
      .eq("user_id", userId)
      .maybeSingle(),
  );
}

/** Live tally, computed by the proposal_tally() RPC for members only. */
export async function getTally(db: SupabaseClient, proposalId: string): Promise<Tally[]> {
  return unwrap<Tally[]>(await db.rpc("proposal_tally", { p_proposal_id: proposalId }));
}
