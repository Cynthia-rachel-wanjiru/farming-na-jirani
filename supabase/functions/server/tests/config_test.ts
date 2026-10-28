import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { loadConfig } from "../lib/config.ts";

const base: Record<string, string> = {
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-value",
};
const env = (extra: Record<string, string> = {}) => (name: string) => ({ ...base, ...extra })[name];

Deno.test("loads required config with defaults", () => {
  const cfg = loadConfig(env());
  assertEquals(cfg.supabaseUrl, "https://abc.supabase.co");
  assertEquals(cfg.allowedOrigins, ["http://localhost:5173"]);
  assertEquals(cfg.serviceRoleKey, undefined);
  assertEquals(cfg.weatherCacheTtlMs, 3 * 60 * 60 * 1000);
});

Deno.test("normalises ALLOWED_ORIGINS to origins", () => {
  const cfg = loadConfig(
    env({ ALLOWED_ORIGINS: "https://farmecho.app/path, http://localhost:5173 " }),
  );
  assertEquals(cfg.allowedOrigins, ["https://farmecho.app", "http://localhost:5173"]);
});

Deno.test("fails fast when SUPABASE_URL is missing", () => {
  assertThrows(
    () => loadConfig((n) => (n === "SUPABASE_URL" ? undefined : base[n])),
    Error,
    "SUPABASE_URL",
  );
});

Deno.test("rejects malformed ALLOWED_ORIGINS", () => {
  assertThrows(() => loadConfig(env({ ALLOWED_ORIGINS: "not a url" })), Error, "ALLOWED_ORIGINS");
});

Deno.test("rejects out-of-range cache TTL", () => {
  assertThrows(
    () => loadConfig(env({ WEATHER_CACHE_TTL_HOURS: "0" })),
    Error,
    "WEATHER_CACHE_TTL_HOURS",
  );
  assertThrows(
    () => loadConfig(env({ WEATHER_CACHE_TTL_HOURS: "99" })),
    Error,
    "WEATHER_CACHE_TTL_HOURS",
  );
});
