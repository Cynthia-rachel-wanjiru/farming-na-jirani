import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_TOPICS, GENERAL_ANSWER } from "../modules/assistant/fallback.ts";
import {
  answerQuestion,
  detectLanguage,
  extractTerms,
  matchBuiltIn,
} from "../modules/assistant/service.ts";
import { askInput } from "../modules/assistant/schemas.ts";

/** Fake client whose rpc('search_knowledge') returns the given rows or error. */
function fakeRpcDb(result: { data?: unknown; error?: { message: string } | null }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const db = {
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

const MLN_ROW = {
  id: "b1000000-0000-4000-8000-000000000001",
  title: "Maize Lethal Necrosis (MLN): identification and control",
  body: "MLN is caused by a combined virus infection.\n\nSecond paragraph ignored in the excerpt.",
  language: "en",
  tags: ["maize"],
  rank: 0.68,
};

const FERT_ROW = {
  id: "b1000000-0000-4000-8000-000000000003",
  title: "Fertilizer application rates for maize",
  body: "Maize responds well to balanced nutrition.",
  language: "en",
  tags: ["maize"],
  rank: 0.22,
};

Deno.test("extractTerms keeps meaningful words and drops stopwords and symbols", () => {
  const terms = extractTerms("How do I control MLN in my maize?");
  assert(terms.includes("mln"));
  assert(terms.includes("maize"));
  assert(terms.includes("control"));
  assert(!terms.includes("how"));
  assert(!terms.includes("my"));
});

Deno.test("extractTerms removes duplicates and caps the term count", () => {
  const many = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
  const terms = extractTerms(`${many} maize maize maize`);
  assertEquals(terms.length <= 12, true);
  assertEquals(new Set(terms).size, terms.length);
});

Deno.test("extractTerms strips characters that could act as query operators", () => {
  const terms = extractTerms("maize & (mln) | !drought:* ");
  for (const t of terms) assertEquals(/^[a-z0-9]+$/.test(t), true, `unsafe term: ${t}`);
});

Deno.test("detectLanguage switches to Swahili on Swahili keywords, else keeps preference", () => {
  assertEquals(detectLanguage("Naomba ushauri kuhusu mbolea ya mahindi", "en"), "sw");
  assertEquals(detectLanguage("How much fertilizer for maize?", "sw"), "sw");
  assertEquals(detectLanguage("How much fertilizer for maize?", "en"), "en");
});

Deno.test("matchBuiltIn returns a substantive answer for every topic in both languages", () => {
  for (const topic of FALLBACK_TOPICS) {
    for (const lang of ["en", "sw"] as const) {
      const keyword = topic.keywords[0];
      assert(keyword, `${topic.id} has no keywords`);
      const answer = matchBuiltIn(keyword, lang);
      assert(answer.length > 80, `${topic.id}/${lang} answer too short`);
      assertEquals(answer, topic.answer[lang]);
    }
  }
});

Deno.test("matchBuiltIn falls back to the general answer and is never blank", () => {
  assertEquals(matchBuiltIn("What is the weather on Mars?", "en"), GENERAL_ANSWER.en);
  assertEquals(matchBuiltIn("zzzz", "sw"), GENERAL_ANSWER.sw);
  assert(GENERAL_ANSWER.en.length > 0 && GENERAL_ANSWER.sw.length > 0);
});

Deno.test("answerQuestion cites the top ranked article and lists related ones", async () => {
  const { db, calls } = fakeRpcDb({ data: [MLN_ROW, FERT_ROW] });
  const result = await answerQuestion(db, "How do I stop maize lethal necrosis?", "en");

  assertEquals(result.source, "knowledge");
  assertEquals(result.citations.length, 2);
  assertEquals(result.citations[0]?.article_id, MLN_ROW.id);
  assertStringIncludes(result.answer, "combined virus infection");
  assertStringIncludes(result.answer, "Related articles: Fertilizer application rates for maize");
  const call = calls[0];
  assert(call, "search_knowledge was not called");
  assertEquals(call.fn, "search_knowledge");
  assertEquals(call.args.p_limit, 3);
  assertEquals(call.args.p_language, "en");
});

Deno.test("answerQuestion uses the built-in fallback when search finds nothing", async () => {
  const { db } = fakeRpcDb({ data: [] });
  const result = await answerQuestion(db, "How do I control fall armyworm?", "en");
  assertEquals(result.source, "built_in");
  assertEquals(result.citations.length, 0);
  assert(result.answer.length > 80);
  assertStringIncludes(result.answer, "Fall armyworm");
});

Deno.test("answerQuestion still answers when the knowledge search errors", async () => {
  const { db } = fakeRpcDb({ error: { message: "connection refused" } });
  const result = await answerQuestion(db, "Tell me about dairy cow milk loss", "en");
  assertEquals(result.source, "built_in");
  assert(result.answer.length > 0, "answer must not be blank on search failure");
});

Deno.test("answerQuestion answers in Swahili for a Swahili question", async () => {
  const { db } = fakeRpcDb({ data: [] });
  const result = await answerQuestion(db, "Naomba ushauri wa mbolea ya mahindi", "en");
  assertEquals(result.language, "sw");
  assertStringIncludes(result.answer, "DAP");
});

Deno.test("askInput rejects short, overlong and unknown-field payloads", () => {
  assertEquals(askInput.safeParse({ question: "hi" }).success, false);
  assertEquals(askInput.safeParse({ question: "x".repeat(1001) }).success, false);
  assertEquals(askInput.safeParse({ question: "maize tips", extra: 1 }).success, false);
  assertEquals(askInput.safeParse({ question: "maize tips" }).success, true);
});

import { setReceiptSchema } from "../modules/receipts/schemas.ts";
import { markCommunityRead, setReceipt } from "../modules/receipts/service.ts";

Deno.test("receipt status accepts only delivered or read", () => {
  assertEquals(setReceiptSchema.safeParse({ status: "read" }).success, true);
  assertEquals(setReceiptSchema.safeParse({ status: "delivered" }).success, true);
  assertEquals(setReceiptSchema.safeParse({ status: "sent" }).success, false);
  assertEquals(setReceiptSchema.safeParse({ status: "read", user_id: "x" }).success, false);
});

Deno.test("setReceipt succeeds when the RPC returns void (null data is not an error)", async () => {
  const db = {
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as unknown as SupabaseClient;
  const out = await setReceipt(db, "e1000000-0000-4000-8000-000000000003", { status: "read" });
  assertEquals(out.status, "read");
});

Deno.test("markCommunityRead returns 0 when nothing was unread, without throwing", async () => {
  const db = {
    rpc: () => Promise.resolve({ data: 0, error: null }),
  } as unknown as SupabaseClient;
  const out = await markCommunityRead(db, "c1000000-0000-4000-8000-000000000001");
  assertEquals(out.marked, 0);
});

Deno.test("setReceipt surfaces an RPC error instead of reporting success", async () => {
  const db = {
    rpc: () =>
      Promise.resolve({ data: null, error: { code: "22023", message: "Invalid receipt status" } }),
  } as unknown as SupabaseClient;
  let threw = false;
  try {
    await setReceipt(db, "e1000000-0000-4000-8000-000000000003", { status: "read" });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
