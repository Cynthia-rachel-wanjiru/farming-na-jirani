/**
 * Community service. Every query runs on the caller's RLS-bound client, so
 * visibility and write rules come from the database policies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOk, unwrap } from "../../lib/db.ts";
import { httpErrors } from "../../lib/errors.ts";
import type {
  CreateCommunityInput,
  ListCommunitiesQuery,
  UpdateCommunityInput,
} from "./schemas.ts";

export interface Community {
  id: string;
  name: string;
  description: string;
  county_code: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const COMMUNITY_COLUMNS = "id, name, description, county_code, created_by, created_at, updated_at";

export async function listCommunities(
  db: SupabaseClient,
  query: ListCommunitiesQuery,
): Promise<Community[]> {
  let q = db
    .from("communities")
    .select(COMMUNITY_COLUMNS)
    .order("created_at", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);
  if (query.county_code) {
    q = q.eq("county_code", query.county_code);
  }
  return unwrap(await q);
}

export async function getCommunity(db: SupabaseClient, id: string): Promise<Community> {
  return unwrap<Community>(
    await db.from("communities").select(COMMUNITY_COLUMNS).eq("id", id).maybeSingle(),
    "Community not found",
  );
}

/**
 * Creates a community. The database trigger makes the creator its leader.
 * RLS allows this only for cooperative leaders and experts.
 */
export async function createCommunity(
  db: SupabaseClient,
  userId: string,
  input: CreateCommunityInput,
): Promise<Community> {
  return unwrap<Community>(
    await db
      .from("communities")
      .insert({ ...input, created_by: userId })
      .select(COMMUNITY_COLUMNS)
      .single(),
  );
}

export async function updateCommunity(
  db: SupabaseClient,
  id: string,
  input: UpdateCommunityInput,
): Promise<Community> {
  // RLS limits updates to community leaders. A non-leader matches no rows,
  // which we report as 403 so the caller learns they lack permission.
  const res = await db
    .from("communities")
    .update(input)
    .eq("id", id)
    .select(COMMUNITY_COLUMNS)
    .maybeSingle();
  if (res.error) {
    assertOk(res);
  }
  if (!res.data) {
    throw httpErrors.forbidden("Only community leaders can edit this community");
  }
  return res.data as Community;
}

export async function joinCommunity(db: SupabaseClient, userId: string, communityId: string) {
  // The policy forces role = 'member'. Leadership is granted by the database trigger.
  assertOk(
    await db.from("community_members").insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
    }),
  );
}

export async function leaveCommunity(db: SupabaseClient, userId: string, communityId: string) {
  const res = await db
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .select("user_id");
  assertOk(res);
  if (!res.data || res.data.length === 0) {
    throw httpErrors.notFound("You are not a member of this community");
  }
}

export async function listMembers(db: SupabaseClient, communityId: string) {
  return unwrap(
    await db
      .from("community_members")
      .select("user_id, role, joined_at, profiles(full_name, county_code)")
      .eq("community_id", communityId)
      .order("joined_at", { ascending: true }),
  );
}
