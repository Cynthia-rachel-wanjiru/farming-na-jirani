/**
 * Knowledge base routes. Search and reading of published articles are public.
 * Writing requires a JWT, and RLS restricts it to experts.
 */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { parse, readJsonBody, uuid } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { articleInputSchema, searchQuery } from "./schemas.ts";
import { createArticle, getArticle, searchArticles, updateArticle } from "./service.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export function knowledgeRoutes(
  auth: MiddlewareHandler<AppEnv>,
  publicDb: SupabaseClient,
) {
  const routes = new Hono<AppEnv>();

  routes.get("/articles/search", async (c) => {
    const query = parse(searchQuery, c.req.query());
    return c.json({ data: await searchArticles(publicDb, query) });
  });

  routes.get("/articles/:id", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await getArticle(publicDb, id) });
  });

  routes.post("/articles", auth, async (c) => {
    const input = parse(articleInputSchema, await readJsonBody(c));
    const article = await createArticle(c.get("db"), c.get("user").id, input);
    return c.json({ data: article }, 201);
  });

  routes.put("/articles/:id", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    const input = parse(articleInputSchema, await readJsonBody(c));
    return c.json({ data: await updateArticle(c.get("db"), id, input) });
  });

  return routes;
}
