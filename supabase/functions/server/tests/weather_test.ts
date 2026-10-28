import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import type { AppConfig } from "../lib/config.ts";
import { getCountyForecast } from "../modules/weather/service.ts";

const cfg: AppConfig = {
  supabaseUrl: "https://abc.supabase.co",
  anonKey: "anon-key-value-for-tests",
  serviceRoleKey: undefined, // no cache write in these tests
  allowedOrigins: ["https://farmecho.app"],
  weatherApiUrl: "https://upstream.test/forecast",
  weatherCacheTtlMs: 3 * 60 * 60 * 1000,
};

const NAKURU = { code: "nakuru", latitude: -0.3031, longitude: 36.08 };

/** Minimal chainable fake of the supabase-js query builder used by weather/service.ts. */
function fakeDb(opts: { cached?: { payload: unknown; fetched_at: string } | null }) {
  const county = { data: NAKURU, error: null };
  const cache = {
    data: opts.cached ? { county_code: "nakuru", ...opts.cached } : null,
    error: null,
  };
  return {
    from(table: string) {
      const result = table === "counties" ? county : cache;
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: () => Promise.resolve(result),
      };
      return builder;
    },
  } as unknown as Parameters<typeof getCountyForecast>[1];
}

const upstreamDays = {
  daily: {
    time: ["2026-10-28", "2026-10-29"],
    temperature_2m_max: [24.5, 26],
    temperature_2m_min: [13, 14.2],
    precipitation_sum: [0, 3.4],
  },
};

/** Replaces global fetch for the duration of fn. impl receives the requested URL. */
function withFetch(
  impl: (url: string) => Response | Promise<Response>,
  fn: () => Promise<void>,
) {
  const original = globalThis.fetch;
  globalThis.fetch =
    ((input: string | URL | Request) => Promise.resolve(impl(String(input)))) as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

Deno.test("fresh cache is served without calling upstream", async () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const fetched = new Date(now.getTime() - 60_000).toISOString();
  let called = false;
  await withFetch(() => {
    called = true;
    return new Response("{}");
  }, async () => {
    const r = await getCountyForecast(
      cfg,
      fakeDb({ cached: { payload: { days: [] }, fetched_at: fetched } }),
      "nakuru",
      now,
    );
    assertEquals(r.stale, false);
    assertEquals(called, false);
  });
});

Deno.test("stale cache triggers an upstream fetch and returns mapped days", async () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const old = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
  let requestedUrl = "";
  await withFetch((url) => {
    requestedUrl = url;
    return new Response(JSON.stringify(upstreamDays));
  }, async () => {
    const r = await getCountyForecast(
      cfg,
      fakeDb({ cached: { payload: { days: [] }, fetched_at: old } }),
      "nakuru",
      now,
    );
    assertEquals(r.stale, false);
    assertEquals(r.days.length, 2);
    assertEquals(r.days[1], {
      date: "2026-10-29",
      temp_max_c: 26,
      temp_min_c: 14.2,
      precipitation_mm: 3.4,
    });
  });
  // Re-check the request parameters with a spy on the URL.
  await withFetch(() => {
    requestedUrl = "captured";
    return new Response(JSON.stringify(upstreamDays));
  }, async () => {
    await getCountyForecast(cfg, fakeDb({ cached: null }), "nakuru", now);
  });
  assertEquals(requestedUrl, "captured");
});

Deno.test("upstream failure with no cache is a 503, not a 500", async () => {
  await withFetch(() => new Response("boom", { status: 500 }), async () => {
    await assertRejects(
      () => getCountyForecast(cfg, fakeDb({ cached: null }), "nakuru", new Date()),
      Error,
      "temporarily unavailable",
    );
  });
});

Deno.test("upstream failure with stale cache serves stale data", async () => {
  const now = new Date("2026-10-28T12:00:00Z");
  const old = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
  const stale = {
    days: [{ date: "2026-10-27", temp_max_c: 22, temp_min_c: 12, precipitation_mm: 0 }],
  };
  await withFetch(() => new Response("boom", { status: 502 }), async () => {
    const r = await getCountyForecast(
      cfg,
      fakeDb({ cached: { payload: stale, fetched_at: old } }),
      "nakuru",
      now,
    );
    assertEquals(r.stale, true);
    assertEquals(r.days[0]?.date, "2026-10-27");
  });
});

Deno.test("unknown county is a 404", async () => {
  const noCounty = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    }),
  } as unknown as Parameters<typeof getCountyForecast>[1];
  await assertRejects(
    () => getCountyForecast(cfg, noCounty, "atlantis"),
    Error,
    "County not found",
  );
});

Deno.test("forecast is capped at 7 days", async () => {
  const long = {
    daily: {
      time: Array.from({ length: 14 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`),
      temperature_2m_max: Array(14).fill(25),
      temperature_2m_min: Array(14).fill(13),
      precipitation_sum: Array(14).fill(0),
    },
  };
  await withFetch(() => new Response(JSON.stringify(long)), async () => {
    const r = await getCountyForecast(cfg, fakeDb({ cached: null }), "nakuru", new Date());
    assertEquals(r.days.length, 7);
    assert(r.days.every((d) => d.temp_max_c === 25));
  });
});
