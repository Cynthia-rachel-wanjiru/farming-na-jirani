/**
 * JWT validation middleware.
 *
 * The bearer token is validated with Supabase Auth (`auth.getUser`). That works
 * whichever signing algorithm the project uses (HS256 or asymmetric keys), and it
 * rejects revoked sessions. On success the user and a user-scoped database
 * client (carrying the same token, so RLS applies) are attached to the context.
 */
import type { MiddlewareHandler } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "../lib/config.ts";
import { createUserClient } from "../lib/db.ts";
import { HttpError, httpErrors } from "../lib/errors.ts";
import type { AppEnv } from "../types.ts";

/** Bearer token: JWT characters only, bounded length. */
const BEARER_PATTERN = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})$/;

export function requireAuth(authClient: SupabaseClient, cfg: AppConfig): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const match = BEARER_PATTERN.exec(c.req.header("authorization") ?? "");
    if (!match) {
      throw httpErrors.unauthorized();
    }
    const token = match[1] as string;

    const { data, error } = await authClient.auth.getUser(token);
    if (error) {
      // No HTTP status means the auth server could not be reached. That is not the caller's fault.
      if (error.status === undefined) {
        throw httpErrors.unavailable("Authentication service unreachable");
      }
      throw httpErrors.unauthorized("Session is invalid or expired");
    }
    if (!data.user) {
      throw new HttpError(401, "unauthorized", "Session is invalid or expired");
    }

    c.set("user", { id: data.user.id, email: data.user.email ?? null });
    c.set("db", createUserClient(cfg, token));
    await next();
  };
}
