/** Weather routes (public read). */
import { Hono } from "hono";
import { createAnonClient } from "../../lib/db.ts";
import type { AppConfig } from "../../lib/config.ts";
import { countyCode, parse } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { getCountyForecast } from "./service.ts";

export function weatherRoutes(cfg: AppConfig) {
  const routes = new Hono<AppEnv>();
  const db = createAnonClient(cfg);

  routes.get("/counties/:code", async (c) => {
    const code = parse(countyCode, c.req.param("code"));
    return c.json({ data: await getCountyForecast(cfg, db, code) });
  });

  return routes;
}
