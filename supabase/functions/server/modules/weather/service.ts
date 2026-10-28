/**
 * County weather forecasts with a database cache.
 *
 * Flow: read `weather_cache` (public). If the entry is fresh, return it.
 * Otherwise fetch the forecast upstream (Open-Meteo, no API key), then store it
 * with the service role. The cache is written only by this server, never by the
 * browser (no write policy exists for anon or authenticated).
 *
 * If the upstream fails and a stale entry exists, the stale entry is served
 * with `stale: true` rather than an error.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "../../lib/config.ts";
import { httpErrors } from "../../lib/errors.ts";
import { createServiceClient, unwrapMaybe } from "../../lib/db.ts";

export interface ForecastDay {
  date: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  precipitation_mm: number | null;
}

export interface CountyForecast {
  county_code: string;
  fetched_at: string;
  stale: boolean;
  days: ForecastDay[];
}

interface CountyPoint {
  code: string;
  latitude: number;
  longitude: number;
}

interface UpstreamPayload {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
}

const FORECAST_DAYS = 7;
const UPSTREAM_TIMEOUT_MS = 6_000;

/** Reads a county's coordinates (public reference data). */
export async function getCountyPoint(db: SupabaseClient, code: string): Promise<CountyPoint> {
  const row = unwrapMaybe(
    await db.from("counties").select("code, latitude, longitude").eq("code", code).maybeSingle(),
  );
  if (!row) {
    throw httpErrors.notFound("County not found");
  }
  return row as unknown as CountyPoint;
}

function toForecast(payload: UpstreamPayload): ForecastDay[] {
  const d = payload.daily;
  const times = d?.time ?? [];
  return times.slice(0, FORECAST_DAYS).map((date, i) => ({
    date,
    temp_max_c: d?.temperature_2m_max?.[i] ?? null,
    temp_min_c: d?.temperature_2m_min?.[i] ?? null,
    precipitation_mm: d?.precipitation_sum?.[i] ?? null,
  }));
}

async function fetchUpstream(cfg: AppConfig, point: CountyPoint): Promise<ForecastDay[]> {
  const url = new URL(cfg.weatherApiUrl);
  url.searchParams.set("latitude", String(point.latitude));
  url.searchParams.set("longitude", String(point.longitude));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("timezone", "Africa/Nairobi");

  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`weather upstream responded ${res.status}`);
  }
  const body = (await res.json()) as UpstreamPayload;
  const days = toForecast(body);
  if (days.length === 0) {
    throw new Error("weather upstream returned no daily data");
  }
  return days;
}

/**
 * Returns a county forecast, refreshing the cache when it is stale.
 * Throws 503 only when there is no cached data and the upstream is down.
 */
export async function getCountyForecast(
  cfg: AppConfig,
  readDb: SupabaseClient,
  code: string,
  now: Date = new Date(),
): Promise<CountyForecast> {
  const point = await getCountyPoint(readDb, code);

  const cached = unwrapMaybe(
    await readDb
      .from("weather_cache")
      .select("county_code, payload, fetched_at")
      .eq("county_code", code)
      .maybeSingle(),
  ) as { county_code: string; payload: { days: ForecastDay[] }; fetched_at: string } | null;

  const isFresh = cached !== null &&
    now.getTime() - new Date(cached.fetched_at).getTime() < cfg.weatherCacheTtlMs;
  if (cached && isFresh) {
    return {
      county_code: code,
      fetched_at: cached.fetched_at,
      stale: false,
      days: cached.payload.days,
    };
  }

  try {
    const days = await fetchUpstream(cfg, point);
    const fetchedAt = now.toISOString();
    if (cfg.serviceRoleKey) {
      const writeDb = createServiceClient(cfg);
      const { error } = await writeDb
        .from("weather_cache")
        .upsert({ county_code: code, payload: { days }, fetched_at: fetchedAt });
      if (error) {
        // A failed cache write should not fail the request: the data is still valid.
        console.error("weather_cache_write_failed", error.code ?? "unknown");
      }
    }
    return { county_code: code, fetched_at: fetchedAt, stale: false, days };
  } catch (err) {
    console.error("weather_upstream_failed", err instanceof Error ? err.message : String(err));
    if (cached) {
      return {
        county_code: code,
        fetched_at: cached.fetched_at,
        stale: true,
        days: cached.payload.days,
      };
    }
    throw httpErrors.unavailable("Weather forecast is temporarily unavailable");
  }
}
