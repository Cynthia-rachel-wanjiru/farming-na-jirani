/**
 * FarmEcho API: Supabase Edge Function entry point.
 *
 * Supabase passes the function name as the first path segment
 * (for example `/server/v1/market/prices`). That prefix is stripped here so the
 * Hono routes can be written as `/v1/...`.
 */
import { createApp } from "./app.ts";
import { loadConfig } from "./lib/config.ts";

const app = createApp(loadConfig());

const FUNCTION_PREFIX = "/server";

Deno.serve((req: Request): Response | Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname === FUNCTION_PREFIX || url.pathname.startsWith(`${FUNCTION_PREFIX}/`)) {
    url.pathname = url.pathname.slice(FUNCTION_PREFIX.length) || "/";
    return app.fetch(new Request(url, req));
  }
  return app.fetch(req);
});
