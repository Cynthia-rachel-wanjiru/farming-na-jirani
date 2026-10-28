/**
 * Builds the Hono application: global middleware, error handling and the
 * versioned route tree. Kept separate from index.ts so tests can build the app
 * without starting a server.
 *
 * Route map (all under /v1, see README.md):
 *   GET    /reference/counties
 *   GET|PATCH /profiles/me         GET /profiles/:id
 *   GET|POST  /communities         GET|PATCH /communities/:id
 *   GET|POST  /communities/:id/members     DELETE /communities/:id/members/me
 *   GET|POST  /communities/:id/messages    DELETE /messages/:id
 *   GET|POST  /communities/:id/proposals   GET /proposals/:id
 *   POST      /proposals/:id/votes         GET /proposals/:id/votes/me
 *   GET       /proposals/:id/tally
 *   GET|POST  /market/prices       GET /market/prices/county/:code/latest
 *   GET       /weather/counties/:code
 *   GET|POST  /knowledge/articles  GET|PUT /knowledge/articles/:id
 *   GET       /knowledge/articles/search
 */
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { createAnonClient } from "./lib/db.ts";
import type { AppConfig } from "./lib/config.ts";
import { type DbErrorLike, HttpError, mapDbError } from "./lib/errors.ts";
import { requireAuth } from "./middleware/auth.ts";
import type { AppEnv } from "./types.ts";
import { communityRoutes } from "./modules/communities/routes.ts";
import { knowledgeRoutes } from "./modules/knowledge/routes.ts";
import { marketRoutes } from "./modules/market/routes.ts";
import { messageItemRoutes } from "./modules/messages/routes.ts";
import { profileRoutes } from "./modules/profiles/routes.ts";
import { referenceRoutes } from "./modules/reference/routes.ts";
import { voteRoutes } from "./modules/voting/routes.ts";
import { weatherRoutes } from "./modules/weather/routes.ts";

/** Largest request body accepted for any versioned route. */
const MAX_BODY_BYTES = 64 * 1024;

export function createApp(cfg: AppConfig) {
  const app = new Hono<AppEnv>();
  const publicDb = createAnonClient(cfg);
  const auth = requireAuth(publicDb, cfg);

  // --- Global middleware --------------------------------------------------
  app.use("*", secureHeaders());
  app.use("*", logger((line) => console.log(line)));
  app.use(
    "*",
    cors({
      // Only configured frontend origins are echoed back. Others get no allow header.
      origin: (origin) => (cfg.allowedOrigins.includes(origin) ? origin : undefined),
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 600,
    }),
  );
  app.use(
    "/v1/*",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json({ error: { code: "payload_too_large", message: "Request body is too large" } }, 413),
    }),
  );

  // --- Error handling -----------------------------------------------------
  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json(
        { error: { code: err.code, message: err.message, details: err.details } },
        err.status,
      );
    }
    if (typeof err === "object" && err !== null && "code" in err) {
      const mapped = mapDbError(err as DbErrorLike);
      return c.json({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
    }
    console.error("unhandled_error", err instanceof Error ? err.message : String(err));
    return c.json({ error: { code: "internal_error", message: "Unexpected server error" } }, 500);
  });

  app.notFound((c) => c.json({ error: { code: "not_found", message: "Route not found" } }, 404));

  // --- Public health check -----------------------------------------------
  app.get(
    "/health",
    (c) => c.json({ status: "ok", service: "farmecho-api", time: new Date().toISOString() }),
  );

  // --- Versioned API -----------------------------------------------------
  app.route("/v1/reference", referenceRoutes(publicDb));
  app.route("/v1/profiles", profileRoutes(auth));
  app.route("/v1/communities", communityRoutes(auth));
  app.route("/v1/messages", messageItemRoutes(auth));
  app.route("/v1", voteRoutes(auth)); // routes carry their own auth; see voting/routes.ts
  app.route("/v1/market", marketRoutes(auth, cfg));
  app.route("/v1/weather", weatherRoutes(cfg));
  app.route("/v1/knowledge", knowledgeRoutes(auth, publicDb));

  return app;
}
