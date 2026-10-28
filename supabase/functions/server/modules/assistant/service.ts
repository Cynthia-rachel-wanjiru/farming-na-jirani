/**
 * Farming assistant. Answers a question with the best-matching published
 * knowledge articles (ranked by search_knowledge), with citations. When the
 * knowledge base has no match, or cannot be reached, it returns built-in
 * advice, so the answer is never blank.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_TOPICS, GENERAL_ANSWER, type Lang } from "./fallback.ts";

export interface Citation {
  article_id: string;
  title: string;
  language: Lang;
}

export interface AssistantAnswer {
  answer: string;
  language: Lang;
  /** "knowledge" when answered from articles, "built_in" otherwise. */
  source: "knowledge" | "built_in";
  citations: Citation[];
}

/** Words too common to help matching. Kept short, English and Swahili. */
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "my",
  "our",
  "i",
  "we",
  "how",
  "what",
  "when",
  "should",
  "can",
  "do",
  "does",
  "with",
  "at",
  "it",
  "this",
  "that",
  "me",
  "you",
  "please",
  "help",
  "need",
  "about",
  "be",
  "if",
  "from",
  "ni",
  "na",
  "wa",
  "ya",
  "kwa",
  "za",
  "la",
  "au",
  "je",
  "nini",
  "vipi",
  "naomba",
  "tafadhali",
]);

/** Turns a free-text question into safe search terms. Only letters and digits are kept. */
export function extractTerms(question: string): string[] {
  const words = question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 12);
}

/** Detects Swahili from common words, so the reply matches the user's language. */
export function detectLanguage(question: string, preferred: Lang): Lang {
  const swahiliHints =
    /\b(mahindi|mbolea|maharage|nyanya|samaki|ng'ombe|maziwa|shamba|ukame|mvua|bei|soko|habari|naomba|vipi|ninawezaje|nina)\b/i;
  return swahiliHints.test(question) ? "sw" : preferred;
}

interface RankedArticle {
  id: string;
  title: string;
  body: string;
  language: Lang;
  rank: number;
}

/** Calls the ranked search. Any failure is logged and returns no results, so the fallback answers. */
async function searchKnowledge(
  db: SupabaseClient,
  terms: string[],
  language: Lang,
): Promise<RankedArticle[]> {
  if (terms.length === 0) return [];
  const { data, error } = await db.rpc("search_knowledge", {
    p_terms: terms,
    p_language: language,
    p_limit: 3,
  });
  if (error) {
    console.error("assistant: knowledge search failed", error.message);
    return [];
  }
  return (data ?? []) as RankedArticle[];
}

/** Picks the first built-in topic whose keywords appear in the question. */
export function matchBuiltIn(question: string, lang: Lang): string {
  const q = question.toLowerCase();
  const topic = FALLBACK_TOPICS.find((t) => t.keywords.some((k) => q.includes(k)));
  return topic ? topic.answer[lang] : GENERAL_ANSWER[lang];
}

/** Shortens an article to its first paragraph or about 600 characters, so answers stay readable. */
function excerpt(body: string): string {
  const firstParagraph = body.split(/\n\s*\n/)[0] ?? body;
  return firstParagraph.length > 600 ? `${firstParagraph.slice(0, 597)}...` : firstParagraph;
}

export async function answerQuestion(
  db: SupabaseClient,
  question: string,
  preferred: Lang,
): Promise<AssistantAnswer> {
  const lang = detectLanguage(question, preferred);
  const terms = extractTerms(question);

  let articles: RankedArticle[] = [];
  try {
    articles = await searchKnowledge(db, terms, lang);
  } catch (err) {
    console.error("assistant: search threw", err);
  }

  const [top, ...others] = articles;
  if (top) {
    const lines = [excerpt(top.body)];
    if (others.length > 0) {
      lines.push(
        lang === "sw"
          ? "Makala zinazohusiana: " + others.map((a) => a.title).join("; ") + "."
          : "Related articles: " + others.map((a) => a.title).join("; ") + ".",
      );
    }
    return {
      answer: lines.join("\n\n"),
      language: lang,
      source: "knowledge",
      citations: articles.map((a) => ({ article_id: a.id, title: a.title, language: a.language })),
    };
  }

  return {
    answer: matchBuiltIn(question, lang),
    language: lang,
    source: "built_in",
    citations: [],
  };
}
