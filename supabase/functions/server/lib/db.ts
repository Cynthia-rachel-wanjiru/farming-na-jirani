/**
 * Supabase client factories and result helpers.
 *
 * Three kinds of client exist, and each has a clear use:
 *  - anon client:    public reads (counties, public prices, published articles).
 *  - user client:    every request made on behalf of a signed-in user. Carries
 *                    the user's JWT, so Postgres RLS enforces access.
 *  - service client: server-only maintenance (weather cache). Bypasses RLS, so
 *                    it must never be used to serve user-driven queries.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "./config.ts";
import { DbErrorLike, HttpError, httpErrors, mapDbError } from "./errors.ts";

const CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

export function createAnonClient(cfg: AppConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.anonKey, CLIENT_OPTIONS);
}

export function createUserClient(cfg: AppConfig, accessToken: string): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.anonKey, {
    ...CLIENT_OPTIONS,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createServiceClient(cfg: AppConfig): SupabaseClient {
  if (!cfg.serviceRoleKey) {
    throw new HttpError(500, "misconfigured", "Service role key is not configured");
  }
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, CLIENT_OPTIONS);
}

/**
 * Unwraps a supabase-js response. Throws a mapped HttpError on database error,
 * and a 404 when a single record was expected but absent.
 */
export function unwrap<T>(
  res: { data: T | null; error: DbErrorLike | null },
  notFoundMessage?: string,
): T {
  if (res.error) {
    console.error("db_error", res.error.code ?? "unknown");
    throw mapDbError(res.error);
  }
  if (res.data === null || res.data === undefined) {
    throw httpErrors.notFound(notFoundMessage);
  }
  return res.data;
}

/** Like unwrap, but a missing row is returned as null instead of a 404. */
export function unwrapMaybe<T>(res: { data: T | null; error: DbErrorLike | null }): T | null {
  if (res.error) {
    console.error("db_error", res.error.code ?? "unknown");
    throw mapDbError(res.error);
  }
  return res.data ?? null;
}

/** Throws a mapped HttpError when a write fails. */
export function assertOk(res: { error: DbErrorLike | null }): void {
  if (res.error) {
    console.error("db_error", res.error.code ?? "unknown");
    throw mapDbError(res.error);
  }
}
