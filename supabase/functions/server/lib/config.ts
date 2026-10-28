/**
 * Runtime configuration, read from environment variables.
 *
 * Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
 * into Edge Functions automatically. The remaining values are optional and
 * have safe defaults.
 */

export interface AppConfig {
  /** Base URL of the Supabase project, for example https://<ref>.supabase.co */
  readonly supabaseUrl: string;
  /** Public anon key. Used for user-scoped clients, so RLS always applies. */
  readonly anonKey: string;
  /** Service role key. Server-side only: used for the weather cache refresh. */
  readonly serviceRoleKey: string | undefined;
  /** Origins allowed by CORS, normalised to `scheme://host[:port]`. */
  readonly allowedOrigins: readonly string[];
  /** Upstream forecast API (Open-Meteo by default, no key required). */
  readonly weatherApiUrl: string;
  /** How long a cached county forecast is considered fresh. */
  readonly weatherCacheTtlMs: number;
}

export type EnvReader = (name: string) => string | undefined;

const DEFAULT_ORIGINS = "http://localhost:5173";
const DEFAULT_WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_WEATHER_TTL_HOURS = 3;

function required(read: EnvReader, name: string): string {
  const value = read(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function parseOrigin(raw: string): string {
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(`ALLOWED_ORIGINS contains an invalid URL: ${raw}`);
  }
}

/**
 * Loads and validates configuration. Throws on missing or malformed required
 * values so misconfiguration fails at boot rather than per request.
 */
export function loadConfig(read: EnvReader = (name) => Deno.env.get(name)): AppConfig {
  const supabaseUrl = required(read, "SUPABASE_URL");
  new URL(supabaseUrl); // throws if malformed

  const origins = (read("ALLOWED_ORIGINS") ?? DEFAULT_ORIGINS)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(parseOrigin);

  const ttlHours = Number(read("WEATHER_CACHE_TTL_HOURS") ?? DEFAULT_WEATHER_TTL_HOURS);
  if (!Number.isFinite(ttlHours) || ttlHours <= 0 || ttlHours > 24) {
    throw new Error("WEATHER_CACHE_TTL_HOURS must be a number between 0 and 24");
  }

  return {
    supabaseUrl,
    anonKey: required(read, "SUPABASE_ANON_KEY"),
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY")?.trim() || undefined,
    allowedOrigins: origins,
    weatherApiUrl: read("WEATHER_API_URL")?.trim() || DEFAULT_WEATHER_API,
    weatherCacheTtlMs: ttlHours * 60 * 60 * 1000,
  };
}
