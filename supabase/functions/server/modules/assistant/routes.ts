/**
 * Assistant routes. Asking a question requires a signed-in user, so the
 * assistant can be rate-limited and attributed later.
 */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parse, readJsonBody } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { askInput } from "./schemas.ts";
import { answerQuestion } from "./service.ts";

export function assistantRoutes(
  auth: MiddlewareHandler<AppEnv>,
  publicDb: SupabaseClient,
) {
  const routes = new Hono<AppEnv>();

  routes.post("/ask", auth, async (c) => {
    const input = parse(askInput, await readJsonBody(c));
    const preferred = input.language ?? "en";
    // Search runs with the anon client: search_knowledge is granted to anon and
    // only ever returns published articles.
    const result = await answerQuestion(publicDb, input.question, preferred);
    return c.json({ data: result });
  });

  return routes;
}
