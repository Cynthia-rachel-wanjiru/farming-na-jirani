/** Reference data routes (public, no JWT): Kenyan counties. */
import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppEnv } from "../../types.ts";
import { listCounties } from "./service.ts";

export function referenceRoutes(db: SupabaseClient) {
  const routes = new Hono<AppEnv>();

  routes.get("/counties", async (c) => {
    return c.json({ data: await listCounties(db) });
  });

  return routes;
}
