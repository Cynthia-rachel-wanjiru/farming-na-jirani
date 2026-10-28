/**
 * Request helpers: JSON body reading, schema validation and LIKE escaping.
 */
import type { Context } from "hono";
import { z } from "zod";
import { HttpError, httpErrors } from "./errors.ts";

/** Reads a JSON body. Rejects other content types and malformed JSON. */
export async function readJsonBody(c: Context): Promise<unknown> {
  const contentType = (c.req.header("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Content-Type must be application/json");
  }
  try {
    return await c.req.json();
  } catch {
    throw httpErrors.badRequest("Request body is not valid JSON");
  }
}

/** Validates input against a zod schema, returning typed data or a 422. */
export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw httpErrors.validation(
      result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/**
 * Escapes LIKE/ILIKE wildcards so user text is matched literally.
 * supabase-js already parameterises values, so this only guards the wildcard
 * semantics of the pattern.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Shared pagination query: `limit` between 1 and 100, default 20. */
export const limitQuery = z.coerce.number().int().min(1).max(100).default(20);

/** Shared UUID path/body parameter. */
export const uuid = z.string().uuid();

/** Shared county code (e.g. "nakuru", "tana-river"). Validated against the table by FK. */
export const countyCode = z.string().regex(/^[a-z][a-z-]{1,39}$/, "Invalid county code");
