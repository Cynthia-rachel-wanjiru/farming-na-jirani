/**
 * Market price service. Reads are public (anon can read). Writes go through the
 * caller's RLS-bound client, so only cooperative leaders and experts can publish.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOk, unwrap } from "../../lib/db.ts";
import { escapeLike } from "../../lib/http.ts";
import type { ListPricesQuery, PublishPriceInput } from "./schemas.ts";

export interface MarketPrice {
  id: number;
  crop: string;
  market_name: string;
  county_code: string;
  unit: string;
  price_kes: number;
  observed_on: string;
  source: string;
  created_at: string;
}

const PRICE_COLUMNS =
  "id, crop, market_name, county_code, unit, price_kes, observed_on, source, created_at";

export async function listPrices(
  db: SupabaseClient,
  query: ListPricesQuery,
): Promise<MarketPrice[]> {
  let q = db
    .from("market_prices")
    .select(PRICE_COLUMNS)
    .order("observed_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(query.limit);
  if (query.county_code) {
    q = q.eq("county_code", query.county_code);
  }
  if (query.crop) {
    q = q.ilike("crop", `%${escapeLike(query.crop)}%`);
  }
  return unwrap(await q);
}

export async function publishPrice(
  db: SupabaseClient,
  userId: string,
  input: PublishPriceInput,
): Promise<MarketPrice> {
  return unwrap<MarketPrice>(
    await db
      .from("market_prices")
      .insert({ ...input, recorded_by: userId })
      .select(PRICE_COLUMNS)
      .single(),
  );
}

/**
 * Latest observation per crop and market in a county. Uses ordering in
 * memory, which is fine for the bounded result set of a single county.
 */
export async function latestPricesForCounty(
  db: SupabaseClient,
  countyCode: string,
): Promise<MarketPrice[]> {
  const rows = unwrap<MarketPrice[]>(
    await db
      .from("market_prices")
      .select(PRICE_COLUMNS)
      .eq("county_code", countyCode)
      .order("observed_on", { ascending: false })
      .limit(500),
  );
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.crop}|${r.market_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { assertOk };
