/**
 * Echo message persistence. Reads and writes use the caller's RLS-bound
 * client: only members of a community can read or post its messages, and
 * senders can delete only their own.
 *
 * Live delivery happens on the client through Supabase Realtime (the
 * echo_messages table is in the supabase_realtime publication, and RLS
 * filters the change events too).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOk, unwrap } from "../../lib/db.ts";
import { httpErrors } from "../../lib/errors.ts";
import type { ListMessagesQuery, PostMessageInput } from "./schemas.ts";

export interface EchoMessage {
  id: string;
  community_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
}

const MESSAGE_COLUMNS = "id, community_id, sender_id, body, created_at";

export async function listMessages(
  db: SupabaseClient,
  communityId: string,
  query: ListMessagesQuery,
): Promise<EchoMessage[]> {
  let q = db
    .from("echo_messages")
    .select(MESSAGE_COLUMNS)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(query.limit);
  if (query.before) {
    q = q.lt("created_at", query.before);
  }
  // Newest first from the database, returned oldest first for chat rendering.
  const rows = unwrap<EchoMessage[]>(await q);
  return rows.reverse();
}

export async function postMessage(
  db: SupabaseClient,
  userId: string,
  communityId: string,
  input: PostMessageInput,
): Promise<EchoMessage> {
  // RLS rejects the insert (42501 -> 403) when the caller is not a member.
  return unwrap<EchoMessage>(
    await db
      .from("echo_messages")
      .insert({ community_id: communityId, sender_id: userId, body: input.body })
      .select(MESSAGE_COLUMNS)
      .single(),
  );
}

export async function deleteMessage(db: SupabaseClient, messageId: string): Promise<void> {
  const res = await db.from("echo_messages").delete().eq("id", messageId).select("id");
  assertOk(res);
  if (!res.data || res.data.length === 0) {
    // Either absent, or not sent by the caller (RLS hides it from delete).
    throw httpErrors.notFound("Message not found or not yours to delete");
  }
}
