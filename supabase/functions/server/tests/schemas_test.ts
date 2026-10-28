import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { updateProfileSchema } from "../modules/profiles/schemas.ts";
import { createCommunitySchema } from "../modules/communities/schemas.ts";
import { castVoteSchema, createProposalSchema } from "../modules/voting/schemas.ts";
import { listPricesQuery, publishPriceSchema } from "../modules/market/schemas.ts";
import { postMessageSchema } from "../modules/messages/schemas.ts";
import { countyCode, escapeLike } from "../lib/http.ts";

const future = (ms: number) => new Date(Date.now() + ms).toISOString();

Deno.test("profile update cannot set role (strict rejects it)", () => {
  assert(!updateProfileSchema.safeParse({ role: "expert" }).success);
});

Deno.test("profile update accepts language and county", () => {
  assert(
    updateProfileSchema.safeParse({ preferred_language: "sw", county_code: "nakuru" }).success,
  );
});

Deno.test("empty profile update is rejected", () => {
  assert(!updateProfileSchema.safeParse({}).success);
});

Deno.test("community name length and unknown keys are enforced", () => {
  assert(!createCommunitySchema.safeParse({ name: "ab", county_code: "nakuru" }).success);
  assert(
    !createCommunitySchema.safeParse({ name: "Maize Co-op", county_code: "nakuru", owner: "x" })
      .success,
  );
  assert(createCommunitySchema.safeParse({ name: "Maize Co-op", county_code: "nakuru" }).success);
});

Deno.test("proposal needs 2-10 unique options", () => {
  const base = { title: "Buy fertiliser together", closes_at: future(86_400_000) };
  assert(!createProposalSchema.safeParse({ ...base, options: ["Yes"] }).success);
  assert(!createProposalSchema.safeParse({ ...base, options: ["Yes", "yes"] }).success);
  assert(createProposalSchema.safeParse({ ...base, options: ["Yes", "No"] }).success);
});

Deno.test("proposal closing in the past is rejected", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  assert(
    !createProposalSchema.safeParse({ title: "Old proposal", options: ["A", "B"], closes_at: past })
      .success,
  );
});

Deno.test("vote requires a uuid option id", () => {
  assert(!castVoteSchema.safeParse({ option_id: "not-a-uuid" }).success);
  assert(castVoteSchema.safeParse({ option_id: "3f0c6a52-6f0b-4d6e-9b8a-2a4c1d9e7f10" }).success);
});

Deno.test("price publish rejects negative and oversized prices", () => {
  const base = { crop: "Maize", market_name: "Nakuru", county_code: "nakuru" };
  assert(!publishPriceSchema.safeParse({ ...base, price_kes: -1 }).success);
  assert(!publishPriceSchema.safeParse({ ...base, price_kes: 1e9 }).success);
  assert(publishPriceSchema.safeParse({ ...base, price_kes: 3200 }).success);
});

Deno.test("price list limit is capped at 200", () => {
  assert(!listPricesQuery.safeParse({ limit: 500 }).success);
});

Deno.test("message body cannot be empty or whitespace", () => {
  assert(!postMessageSchema.safeParse({ body: "   " }).success);
  assert(postMessageSchema.safeParse({ body: "Habari" }).success);
});

Deno.test("LIKE wildcards are escaped", () => {
  assertEquals(escapeLike("50%_off\\"), "50\\%\\_off\\\\");
});

Deno.test("county code must match the slug format", () => {
  assertThrows(() => countyCode.parse("Nakuru; drop"));
  assertEquals(countyCode.parse("tana-river"), "tana-river");
});
