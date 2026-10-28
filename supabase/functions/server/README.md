# FarmEcho API (Supabase Edge Function)

A Hono REST API running as a Supabase Edge Function. It serves FarmEcho's six modules: Echo
messaging, Voting Hub, Knowledge Base, Market Intelligence, Weather, and Role-Based Profiles with
bilingual (English / Swahili) support.

Data lives in Supabase PostgreSQL and is protected by Row Level Security (RLS). The API is a thin,
validated layer over those policies.

```
supabase/
├── migrations/
│   └── 20261028120000_farmecho_init.sql   Schema, triggers, RLS, grants
└── functions/server/
    ├── index.ts          Edge Function entry (strips the /server prefix)
    ├── app.ts            Hono app: middleware, error handling, route tree
    ├── deno.json         Import map, compiler options, tasks
    ├── lib/              config, db clients, errors, request helpers
    ├── middleware/auth.ts  JWT validation (Supabase Auth)
    ├── modules/<name>/   routes.ts (HTTP) · service.ts (data) · schemas.ts (zod)
    └── tests/            Deno tests (no live database required)
```

Each module separates three concerns: `routes.ts` handles HTTP, `service.ts` talks to the database,
and `schemas.ts` validates input.

---

## 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) 2.x
- [Deno](https://deno.land) 2.x (only for local checks and tests)
- A Supabase project. Note its project ref and API keys.

## 2. Environment variables

Supabase injects these into every Edge Function automatically:

| Variable                    | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `SUPABASE_URL`              | Project URL, `https://<ref>.supabase.co`. Required.                    |
| `SUPABASE_ANON_KEY`         | Public key. Used for user-scoped clients, so RLS applies. Required.    |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Writes the weather cache. Never expose it to the browser. |

Set the optional values yourself:

| Variable                  | Default                      | Purpose                                                                                              |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`         | `http://localhost:5173`      | Comma-separated frontend origins for CORS, for example `https://farmecho.app,http://localhost:5173`. |
| `WEATHER_API_URL`         | Open-Meteo forecast endpoint | Upstream forecast API. No key required.                                                              |
| `WEATHER_CACHE_TTL_HOURS` | `3`                          | How long a cached county forecast stays fresh (0 to 24).                                             |

Set secrets for the hosted function (do not commit them):

```bash
supabase secrets set \
  ALLOWED_ORIGINS="https://farmecho.app,http://localhost:5173" \
  WEATHER_CACHE_TTL_HOURS=3
```

For local development, put the values in `supabase/.env` (git-ignored) and run
`supabase functions serve server --env-file supabase/.env`.

## 3. Apply database migrations

```bash
# Link the project once
supabase link --project-ref <your-project-ref>

# Apply every migration in supabase/migrations/ in order
supabase db push
```

The migration creates the tables, seeds all 47 counties, and installs the triggers and RLS policies.
Re-running it is not supported. Add new changes as new migration files.

Check the result in the Supabase SQL editor:

```sql
select count(*) from public.counties;   -- expect 47
select rowsecurity from pg_tables where schemaname = 'public';  -- all true
```

## 4. Deploy the Edge Function

```bash
supabase functions deploy server --no-verify-jwt
```

`--no-verify-jwt` is deliberate. The function validates the JWT itself with Supabase Auth
(`auth.getUser`) so it can return FarmEcho's own error shape, and so public routes (counties,
prices, weather, published articles) work without a token. Public routes still never write data
without auth.

Smoke test after deploy (replace the placeholders):

```bash
curl https://<ref>.supabase.co/functions/v1/server/health
curl https://<ref>.supabase.co/functions/v1/server/v1/reference/counties
```

## 5. Frontend integration

Call the API at `https://<ref>.supabase.co/functions/v1/server/v1/...` and send the signed-in user's
access token:

```ts
const res = await fetch(`${SUPABASE_URL}/functions/v1/server/v1/profiles/me`, {
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

Use the Supabase Realtime client to subscribe to `echo_messages` inserts for live chat. RLS filters
those events to community members.

When you sign up a user, pass profile details in the metadata. The database trigger creates the
profile from them:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name, county_code: "nakuru", preferred_language: "sw" } },
});
```

## 6. API reference

All responses are JSON. Successes return `{ "data": ... }`. Errors return
`{ "error": { "code", "message", "details?" } }`.

| Method | Path                                    | Auth                   | Description                                        |
| ------ | --------------------------------------- | ---------------------- | -------------------------------------------------- |
| GET    | `/health`                               | none                   | Liveness check                                     |
| GET    | `/v1/reference/counties`                | none                   | All 47 counties                                    |
| GET    | `/v1/profiles/me`                       | JWT                    | Own profile (role, county, language)               |
| PATCH  | `/v1/profiles/me`                       | JWT                    | Update name, county or language. Role is rejected. |
| GET    | `/v1/profiles/:id`                      | JWT                    | Public view: name, role, county                    |
| GET    | `/v1/communities`                       | JWT                    | List communities (`?county_code=&limit=&offset=`)  |
| POST   | `/v1/communities`                       | JWT (leader/expert)    | Create a community                                 |
| GET    | `/v1/communities/:id`                   | JWT                    | Community detail                                   |
| PATCH  | `/v1/communities/:id`                   | JWT (community leader) | Edit name or description                           |
| GET    | `/v1/communities/:id/members`           | JWT (member)           | Member roster                                      |
| POST   | `/v1/communities/:id/members`           | JWT                    | Join as a member                                   |
| DELETE | `/v1/communities/:id/members/me`        | JWT                    | Leave a community                                  |
| GET    | `/v1/communities/:id/messages`          | JWT (member)           | Echo history (`?before=&limit=`)                   |
| POST   | `/v1/communities/:id/messages`          | JWT (member)           | Post an Echo message                               |
| DELETE | `/v1/messages/:id`                      | JWT (sender)           | Delete own message                                 |
| GET    | `/v1/communities/:id/proposals`         | JWT (member)           | List proposals                                     |
| POST   | `/v1/communities/:id/proposals`         | JWT (member)           | Create a proposal with 2–10 options                |
| GET    | `/v1/proposals/:id`                     | JWT (member)           | Proposal and its options                           |
| POST   | `/v1/proposals/:id/votes`               | JWT (member)           | Cast your one vote `{ option_id }`                 |
| GET    | `/v1/proposals/:id/votes/me`            | JWT                    | Your own vote, or `null`                           |
| GET    | `/v1/proposals/:id/tally`               | JWT (member)           | Live tally per option                              |
| GET    | `/v1/market/prices`                     | none                   | Price feed (`?crop=&county_code=&limit=`)          |
| GET    | `/v1/market/prices/county/:code/latest` | none                   | Latest price per crop and market                   |
| POST   | `/v1/market/prices`                     | JWT (leader/expert)    | Publish a price                                    |
| GET    | `/v1/weather/counties/:code`            | none                   | 7-day forecast, cached per county                  |
| GET    | `/v1/knowledge/articles/search`         | none                   | Full-text search (`?q=&language=`)                 |
| GET    | `/v1/knowledge/articles/:id`            | none                   | Published article                                  |
| POST   | `/v1/knowledge/articles`                | JWT (expert)           | Author an article                                  |
| PUT    | `/v1/knowledge/articles/:id`            | JWT (author)           | Update an article                                  |

Status codes: `400` bad request, `401` missing or invalid token, `403` not permitted (RLS), `404`
not found, `409` duplicate (for example a second vote), `413` body too large, `415` wrong content
type, `422` validation failed, `503` upstream unavailable, `500` unexpected.

## 7. Security model

- **Authentication.** Every protected route validates the bearer token with Supabase Auth. This
  works with both HS256 and asymmetric signing keys, and it rejects revoked sessions.
- **Authorisation lives in the database.** Each protected request runs on a client that carries the
  user's JWT, so RLS decides what they can read and write. The API layer cannot be used to bypass
  it.
- **Roles cannot be self-assigned.** Profile updates are `.strict()` and reject `role`. A database
  trigger also blocks it. Only an administrator (SQL editor or the service role) can promote users.
- **One vote per member per proposal.** Enforced by a primary key. The votes ledger is append-only:
  no update or delete is granted or allowed by policy.
- **Input validation.** Every body and parameter goes through a zod schema (strict, length-bounded).
  Unknown keys are rejected. LIKE wildcards are escaped.
- **Injection.** All queries are parameterised by supabase-js. Full-text search uses
  `websearch_to_tsquery`, so input is never parsed as raw tsquery.
- **Errors.** Database messages are never returned. Postgres error codes map to generic messages.
- **CORS.** Only origins in `ALLOWED_ORIGINS` receive an allow header.
- **Headers and size.** Secure headers are set. Request bodies are capped at 64 KB.
- **Service role.** Used only for the weather cache. It is never used for user-driven queries.

## 8. Local development

```bash
cd supabase/functions/server

deno task check   # type-check
deno task lint
deno task test    # 39 tests, no database or network needed
deno task fmt
```

To run the function locally against your project:

```bash
supabase start                                  # local Postgres + Auth
supabase functions serve server --env-file supabase/.env
curl http://localhost:54321/functions/v1/server/health
```

## 9. Testing the database policies

The RLS policies and business rules were tested against PostgreSQL 17 with a stand-in for Supabase's
`auth` schema. Each test runs as the `anon` or `authenticated` role with a chosen `auth.uid()`.
Covered:

- Community creation needs the leader or expert role.
- Members can only post or read in their own community.
- A vote is accepted once per member per proposal, and only while open.
- The votes ledger rejects updates and deletes.
- Users cannot change their own role, and cannot edit other profiles.
- Only leaders and experts can publish prices or articles.
- Anonymous users read published content only, and cannot write the weather cache.

To rerun this against a local Supabase database:

```bash
supabase db reset   # applies migrations to the local database
```

## 10. Troubleshooting

- **`Missing required environment variable SUPABASE_URL`**: the function is running without
  Supabase's injected variables. Check with `supabase functions serve`.
- **`403` on writes you expect to work**: the caller lacks the role or membership the policy needs.
  Check the user's row in `profiles` and `community_members`.
- **`503 Authentication service unreachable`**: Supabase Auth could not be reached. Check the
  project status.
- **Weather returns `stale: true`**: the upstream forecast API failed. The last good cached forecast
  is served until it recovers.
