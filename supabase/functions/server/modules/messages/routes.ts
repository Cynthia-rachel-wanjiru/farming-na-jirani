/**
 * Echo message route handlers.
 *
 * - `messageRoutes` is mounted under `/communities/:communityId` and handles
 *   listing and posting messages in that community.
 * - `messageItemRoutes` is mounted at `/messages` and handles deleting one message.
 *
 * Both are protected by the auth middleware, which the parent applies.
 */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { parse, readJsonBody, uuid } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { listMessagesQuery, postMessageSchema } from "./schemas.ts";
import { deleteMessage, listMessages, postMessage } from "./service.ts";

export function messageRoutes() {
  const routes = new Hono<AppEnv>();

  routes.get("/messages", async (c) => {
    const communityId = parse(uuid, c.req.param("communityId"));
    const query = parse(listMessagesQuery, c.req.query());
    return c.json({ data: await listMessages(c.get("db"), communityId, query) });
  });

  routes.post("/messages", async (c) => {
    const communityId = parse(uuid, c.req.param("communityId"));
    const input = parse(postMessageSchema, await readJsonBody(c));
    const message = await postMessage(c.get("db"), c.get("user").id, communityId, input);
    return c.json({ data: message }, 201);
  });

  return routes;
}

export function messageItemRoutes(auth: MiddlewareHandler<AppEnv>) {
  const routes = new Hono<AppEnv>();

  routes.delete("/:id", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    await deleteMessage(c.get("db"), id);
    return c.body(null, 204);
  });

  return routes;
}
