import { assertEquals } from "jsr:@std/assert@1";
import { mapDbError } from "../lib/errors.ts";

Deno.test("RLS violation maps to 403 without leaking the DB message", () => {
  const e = mapDbError({
    code: "42501",
    message: 'new row violates row-level security policy for table "votes"',
  });
  assertEquals(e.status, 403);
  assertEquals(e.code, "forbidden");
  assertEquals(e.message.includes("votes"), false);
});

Deno.test("unique violation maps to 409", () => {
  assertEquals(mapDbError({ code: "23505" }).status, 409);
});

Deno.test("foreign key violation maps to 422 invalid_reference", () => {
  const e = mapDbError({ code: "23503" });
  assertEquals(e.status, 422);
  assertEquals(e.code, "invalid_reference");
});

Deno.test("unknown database error maps to a generic 500", () => {
  const e = mapDbError({ code: "XX000", message: "secret internals" });
  assertEquals(e.status, 500);
  assertEquals(e.message.includes("secret"), false);
});
