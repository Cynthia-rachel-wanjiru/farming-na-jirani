/** Profile route handlers. All routes require a valid JWT. */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { parse, readJsonBody, uuid } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { updateProfileSchema } from "./schemas.ts";
import { getProfile, getPublicProfile, updateOwnProfile } from "./service.ts";

export function profileRoutes(auth: MiddlewareHandler<AppEnv>) {
  const routes = new Hono<AppEnv>();
  routes.use("*", auth);

  /** The caller's own profile, including role and language preference. */
  routes.get("/me", async (c) => {
    const { id } = c.get("user");
    return c.json({ data: await getProfile(c.get("db"), id) });
  });

  /** Updates the caller's own name, county or language. Role changes are rejected. */
  routes.patch("/me", async (c) => {
    const { id } = c.get("user");
    const input = parse(updateProfileSchema, await readJsonBody(c));
    return c.json({ data: await updateOwnProfile(c.get("db"), id, input) });
  });

  /** Public view of another member: name, role and county only. */
  routes.get("/:id", async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await getPublicProfile(c.get("db"), id) });
  });

  return routes;
}
