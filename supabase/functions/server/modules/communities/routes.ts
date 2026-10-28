/** Community route handlers. All routes require a valid JWT. */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { parse, readJsonBody, uuid } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { messageRoutes } from "../messages/routes.ts";
import { proposalRoutes } from "../voting/routes.ts";
import { createCommunitySchema, listCommunitiesQuery, updateCommunitySchema } from "./schemas.ts";
import {
  createCommunity,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listMembers,
  updateCommunity,
} from "./service.ts";

export function communityRoutes(auth: MiddlewareHandler<AppEnv>) {
  const routes = new Hono<AppEnv>();
  routes.use("*", auth);

  routes.get("/", async (c) => {
    const query = parse(listCommunitiesQuery, c.req.query());
    return c.json({ data: await listCommunities(c.get("db"), query) });
  });

  routes.post("/", async (c) => {
    const input = parse(createCommunitySchema, await readJsonBody(c));
    const community = await createCommunity(c.get("db"), c.get("user").id, input);
    return c.json({ data: community }, 201);
  });

  routes.get("/:id", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await getCommunity(c.get("db"), id) });
  });

  routes.patch("/:id", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    const input = parse(updateCommunitySchema, await readJsonBody(c));
    return c.json({ data: await updateCommunity(c.get("db"), id, input) });
  });

  routes.get("/:id/members", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await listMembers(c.get("db"), id) });
  });

  routes.post("/:id/members", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    await joinCommunity(c.get("db"), c.get("user").id, id);
    return c.json({ data: { community_id: id, role: "member" } }, 201);
  });

  routes.delete("/:id/members/me", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    await leaveCommunity(c.get("db"), c.get("user").id, id);
    return c.body(null, 204);
  });

  // Nested resources: Echo messages and proposals belong to a community.
  routes.route("/:communityId", messageRoutes());
  routes.route("/:communityId", proposalRoutes());

  return routes;
}
