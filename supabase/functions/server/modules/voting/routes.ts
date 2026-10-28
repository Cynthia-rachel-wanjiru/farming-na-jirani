/**
 * Voting route handlers.
 *
 * - `proposalRoutes()` is mounted under `/communities/:communityId` for listing
 *   and creating proposals. The community router applies auth to it.
 * - `voteRoutes(auth)` is mounted at `/v1` for reading a proposal, casting a
 *   vote and viewing the tally. It applies `auth` to each protected route, not
 *   to the whole `/v1` prefix, so public routes stay public.
 */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { parse, readJsonBody, uuid } from "../../lib/http.ts";
import type { AppEnv } from "../../types.ts";
import { castVoteSchema, createProposalSchema } from "./schemas.ts";
import {
  castVote,
  createProposal,
  getMyVote,
  getProposal,
  getTally,
  listProposals,
} from "./service.ts";

export function proposalRoutes() {
  const routes = new Hono<AppEnv>();

  routes.get("/proposals", async (c) => {
    const communityId = parse(uuid, c.req.param("communityId"));
    return c.json({ data: await listProposals(c.get("db"), communityId) });
  });

  routes.post("/proposals", async (c) => {
    const communityId = parse(uuid, c.req.param("communityId"));
    const input = parse(createProposalSchema, await readJsonBody(c));
    const id = await createProposal(c.get("db"), communityId, input);
    return c.json({ data: { id } }, 201);
  });

  return routes;
}

export function voteRoutes(auth: MiddlewareHandler<AppEnv>) {
  const routes = new Hono<AppEnv>();

  routes.get("/proposals/:id", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await getProposal(c.get("db"), id) });
  });

  routes.post("/proposals/:id/votes", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    const input = parse(castVoteSchema, await readJsonBody(c));
    const vote = await castVote(c.get("db"), c.get("user").id, id, input);
    return c.json({ data: vote }, 201);
  });

  routes.get("/proposals/:id/votes/me", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await getMyVote(c.get("db"), c.get("user").id, id) });
  });

  routes.get("/proposals/:id/tally", auth, async (c) => {
    const id = parse(uuid, c.req.param("id"));
    return c.json({ data: await getTally(c.get("db"), id) });
  });

  return routes;
}
