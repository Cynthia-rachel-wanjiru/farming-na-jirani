/** Market intelligence routes. Reads are public; publishing requires a JWT. */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { createAnonClient } from "../../lib/db.ts";
import { countyCode, parse, readJsonBody } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { listPricesQuery, publishPriceSchema } from "./schemas.ts";
import { latestPricesForCounty, listPrices, publishPrice } from "./service.ts";
import type { AppConfig } from "../../lib/config.ts";

export function marketRoutes(auth: MiddlewareHandler<AppEnv>, cfg: AppConfig) {
  const routes = new Hono<AppEnv>();
  const publicDb = createAnonClient(cfg);

  routes.get("/prices", async (c) => {
    const query = parse(listPricesQuery, c.req.query());
    return c.json({ data: await listPrices(publicDb, query) });
  });

  routes.get("/prices/county/:code/latest", async (c) => {
    const code = parse(countyCode, c.req.param("code"));
    return c.json({ data: await latestPricesForCounty(publicDb, code) });
  });

  routes.post("/prices", auth, async (c) => {
    const input = parse(publishPriceSchema, await readJsonBody(c));
    const price = await publishPrice(c.get("db"), c.get("user").id, input);
    return c.json({ data: price }, 201);
  });

  return routes;
}
