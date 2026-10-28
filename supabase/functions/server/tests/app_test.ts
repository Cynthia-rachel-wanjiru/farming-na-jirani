import { assert, assertEquals } from "jsr:@std/assert@1";
import { createApp } from "../app.ts";
import type { AppConfig } from "../lib/config.ts";

const cfg: AppConfig = {
  supabaseUrl: "https://abc.supabase.co",
  anonKey: "anon-key-value-for-tests",
  serviceRoleKey: undefined,
  allowedOrigins: ["https://farmecho.app"],
  weatherApiUrl: "https://api.open-meteo.com/v1/forecast",
  weatherCacheTtlMs: 3 * 60 * 60 * 1000,
};
const app = createApp(cfg);
const req = (path: string, init?: RequestInit) => app.request(`http://localhost${path}`, init);

Deno.test("health endpoint responds ok", async () => {
  const res = await req("/health");
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "ok");
});

Deno.test("unknown route returns JSON 404", async () => {
  const res = await req("/v1/nope");
  assertEquals(res.status, 404);
  assertEquals((await res.json()).error.code, "not_found");
});

Deno.test("protected routes reject missing bearer token with 401", async () => {
  for (
    const path of [
      "/v1/profiles/me",
      "/v1/communities",
      "/v1/communities/00000000-0000-0000-0000-000000000000/messages",
    ]
  ) {
    const res = await req(path);
    assertEquals(res.status, 401, path);
  }
});

Deno.test("malformed Authorization header is rejected before any upstream call", async () => {
  const res = await req("/v1/profiles/me", { headers: { Authorization: "Basic abc" } });
  assertEquals(res.status, 401);
});

Deno.test("public routes are not gated by auth (no 401)", async () => {
  // Reaching the DB is out of scope here, so we only assert the auth gate is not applied.
  // With no live Supabase, the request fails in the data layer, never with 401.
  for (const path of ["/v1/weather/counties/nakuru", "/v1/market/prices"]) {
    const res = await req(path);
    assert(res.status !== 401, `${path} returned 401`);
  }
});

Deno.test("CORS allows a configured origin and omits others", async () => {
  const ok = await req("/health", { headers: { Origin: "https://farmecho.app" } });
  assertEquals(ok.headers.get("access-control-allow-origin"), "https://farmecho.app");
  const bad = await req("/health", { headers: { Origin: "https://evil.example" } });
  assertEquals(bad.headers.get("access-control-allow-origin"), null);
});

Deno.test("preflight for PATCH from an allowed origin succeeds", async () => {
  const res = await req("/v1/profiles/me", {
    method: "OPTIONS",
    headers: { Origin: "https://farmecho.app", "Access-Control-Request-Method": "PATCH" },
  });
  assert(res.status < 300);
  assert((res.headers.get("access-control-allow-methods") ?? "").includes("PATCH"));
});

Deno.test("secure headers are set", async () => {
  const res = await req("/health");
  assertEquals(res.headers.get("x-content-type-options"), "nosniff");
});

Deno.test("oversized body is rejected with 413 on /v1 routes", async () => {
  const res = await req("/v1/market/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + "a".repeat(30) },
    body: "x".repeat(70 * 1024),
  });
  assertEquals(res.status, 413);
});

Deno.test("write routes require auth before parsing the body", async () => {
  const res = await req("/v1/knowledge/articles", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hello",
  });
  assertEquals(res.status, 401);
});

Deno.test("message delete without a token is 401, never a 500", async () => {
  const res = await req("/v1/messages/not-a-uuid", { method: "DELETE" });
  assertEquals(res.status, 401);
});

Deno.test("nested community message and proposal routes are gated by auth", async () => {
  const cid = "00000000-0000-0000-0000-000000000000";
  for (
    const [method, path] of [
      ["GET", `/v1/communities/${cid}/messages`],
      ["POST", `/v1/communities/${cid}/messages`],
      ["GET", `/v1/communities/${cid}/proposals`],
      ["POST", `/v1/communities/${cid}/proposals`],
    ] as const
  ) {
    const res = await req(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? "{}" : undefined,
    });
    assertEquals(res.status, 401, `${method} ${path}`);
  }
});
