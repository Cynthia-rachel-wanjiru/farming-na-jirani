/** Profile service: reads and updates user profiles through the caller's RLS-bound client. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "../../lib/db.ts";
import type { UpdateProfileInput } from "./schemas.ts";

export interface Profile {
  id: string;
  full_name: string;
  role: "farmer" | "cooperative_leader" | "expert";
  county_code: string | null;
  preferred_language: "en" | "sw";
  created_at: string;
  updated_at: string;
}

const PROFILE_COLUMNS =
  "id, full_name, role, county_code, preferred_language, created_at, updated_at";

export async function getProfile(db: SupabaseClient, userId: string): Promise<Profile> {
  return unwrap<Profile>(
    await db.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
    "Profile not found",
  );
}

/**
 * Updates the caller's own profile. RLS (profiles_update_own) and the column
 * grant restrict this to full_name, county_code and preferred_language.
 */
export async function updateOwnProfile(
  db: SupabaseClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  const updated = await db
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  return unwrap<Profile>(updated, "Profile not found");
}

export async function getPublicProfile(db: SupabaseClient, id: string): Promise<Partial<Profile>> {
  return unwrap(
    await db
      .from("profiles")
      .select("id, full_name, role, county_code")
      .eq("id", id)
      .maybeSingle(),
    "Profile not found",
  );
}
