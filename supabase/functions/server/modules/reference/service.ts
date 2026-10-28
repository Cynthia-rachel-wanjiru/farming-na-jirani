/** Reference data service: read-only lookups. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "../../lib/db.ts";

export interface County {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** All 47 counties, ordered by name. Public reference data. */
export async function listCounties(db: SupabaseClient): Promise<County[]> {
  return unwrap(
    await db
      .from("counties")
      .select("code, name, latitude, longitude")
      .order("name", { ascending: true }),
  );
}
