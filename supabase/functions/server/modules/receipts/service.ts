/**
 * Read-receipt service. Calls the set_receipt and mark_community_read RPCs
 * with the caller's own client, so RLS limits each user to their own receipts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOk, unwrapMaybe } from "../../lib/db.ts";
import type { SetReceiptInput } from "./schemas.ts";

export async function setReceipt(
  db: SupabaseClient,
  messageId: string,
  input: SetReceiptInput,
): Promise<{ message_id: string; status: string }> {
  // set_receipt returns void: success is "no error", so do not treat null as missing.
  assertOk(await db.rpc("set_receipt", { p_message_id: messageId, p_status: input.status }));
  return { message_id: messageId, status: input.status };
}

/** Marks every unread message in the community as read. Returns how many changed. */
export async function markCommunityRead(
  db: SupabaseClient,
  communityId: string,
): Promise<{ community_id: string; marked: number }> {
  // A count of 0 is a valid result (nothing was unread), so only errors throw.
  const marked = unwrapMaybe<number>(
    await db.rpc("mark_community_read", { p_community_id: communityId }),
  );
  return { community_id: communityId, marked: Number(marked ?? 0) };
}
