/**
 * Error model shared by all modules. Every error leaves the API as
 * `{ error: { code, message, details? } }` with an HTTP status.
 */
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ErrorDetail {
  path?: string;
  message: string;
}

/** An error the client can act on. Only these messages are sent to callers. */
export class HttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const httpErrors = {
  badRequest: (message = "Bad request") => new HttpError(400, "bad_request", message),
  unauthorized: (message = "Authentication required") =>
    new HttpError(401, "unauthorized", message),
  forbidden: (message = "You are not allowed to perform this action") =>
    new HttpError(403, "forbidden", message),
  notFound: (message = "Resource not found") => new HttpError(404, "not_found", message),
  conflict: (message = "A record with these details already exists") =>
    new HttpError(409, "conflict", message),
  validation: (details: ErrorDetail[]) =>
    new HttpError(422, "validation_failed", "Request validation failed", details),
  unavailable: (message = "Service temporarily unavailable") =>
    new HttpError(503, "service_unavailable", message),
};

/** Shape of a PostgREST / Postgres error as returned by supabase-js. */
export interface DbErrorLike {
  code?: string;
  message?: string;
}

/**
 * Converts a database error into a client-safe HTTP error. Raw database
 * messages are never returned, because they can reveal schema details.
 */
export function mapDbError(err: DbErrorLike): HttpError {
  switch (err.code) {
    // RLS violation or missing privilege: the caller may not do this.
    case "42501":
      return httpErrors.forbidden();
    // Unique violation: duplicate vote, duplicate price row, duplicate member.
    case "23505":
      return httpErrors.conflict();
    // Foreign key violation: a referenced id or county does not exist.
    case "23503":
      return new HttpError(422, "invalid_reference", "A referenced record does not exist");
    // Check, not-null, invalid parameter, string too long.
    case "23502":
    case "23514":
    case "22023":
    case "22001":
      return new HttpError(422, "invalid_value", "One or more values are invalid");
    // Malformed input for the column type.
    case "22P02":
      return httpErrors.badRequest("Malformed identifier or value");
    // PostgREST: single-row request matched zero rows (often hidden by RLS).
    case "PGRST116":
      return httpErrors.notFound();
    default:
      return new HttpError(500, "internal_error", "Unexpected server error");
  }
}
