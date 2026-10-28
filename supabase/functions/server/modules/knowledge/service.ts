/**
 * Knowledge base service: full-text search over published articles, plus
 * expert-only authoring. Search uses websearch_to_tsquery, so user input is
 * never interpreted as raw SQL or tsquery syntax.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "../../lib/db.ts";
import type { ArticleInput, SearchQuery } from "./schemas.ts";

export interface Article {
  id: string;
  title: string;
  body: string;
  language: "en" | "sw";
  tags: string[];
  published: boolean;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

const ARTICLE_COLUMNS =
  "id, title, body, language, tags, published, author_id, created_at, updated_at";

export async function searchArticles(db: SupabaseClient, query: SearchQuery): Promise<Article[]> {
  let q = db
    .from("knowledge_articles")
    .select(ARTICLE_COLUMNS)
    .textSearch("search_vector", query.q, { type: "websearch", config: "simple" })
    .limit(query.limit);
  if (query.language) {
    q = q.eq("language", query.language);
  }
  return unwrap(await q);
}

export async function getArticle(db: SupabaseClient, id: string): Promise<Article> {
  return unwrap<Article>(
    await db.from("knowledge_articles").select(ARTICLE_COLUMNS).eq("id", id).maybeSingle(),
    "Article not found",
  );
}

/** Creates an article. RLS allows this only for experts, as the author. */
export async function createArticle(
  db: SupabaseClient,
  userId: string,
  input: ArticleInput,
): Promise<Article> {
  return unwrap<Article>(
    await db
      .from("knowledge_articles")
      .insert({ ...input, author_id: userId })
      .select(ARTICLE_COLUMNS)
      .single(),
  );
}

/** Updates an article. RLS limits this to the author who is still an expert. */
export async function updateArticle(
  db: SupabaseClient,
  id: string,
  input: ArticleInput,
): Promise<Article> {
  return unwrap<Article>(
    await db
      .from("knowledge_articles")
      .update(input)
      .eq("id", id)
      .select(ARTICLE_COLUMNS)
      .maybeSingle(),
    "Article not found or you cannot edit it",
  );
}
