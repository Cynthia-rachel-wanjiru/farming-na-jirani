/**
 * Read-receipt routes, mounted under /v1/messages. All require sign-in.
 */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { parse, readJsonBody, uuid } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { setReceiptSchema } from "./schemas.ts";
import { markCommunityRead, setReceipt } from "./service.ts";

export function receiptRoutes(auth: MiddlewareHandler<AppEnv>) {
  const routes = new Hono<AppEnv>();

  routes.put("/:id/receipt", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    const input = parse(setReceiptSchema, await readJsonBody(c));
    return c.json({ data: await setReceipt(c.get("db"), id, input) });
  });

  routes.post("/community/:communityId/read", auth, async (c) => {
    const communityId = parse(uuid, c.req.param("communityId"));
    return c.json({ data: await markCommunityRead(c.get("db"), communityId) });
  });

  return routes;
}
