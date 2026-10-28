/** Knowledge base schemas. */
import { z } from "zod";

export const articleInputSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(10).max(20_000),
    language: z.enum(["en", "sw"]).default("en"),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    published: z.boolean().default(true),
  })
  .strict();

export const searchQuery = z
  .object({
    q: z.string().trim().min(2).max(200),
    language: z.enum(["en", "sw"]).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export type ArticleInput = z.infer<typeof articleInputSchema>;
export type SearchQuery = z.infer<typeof searchQuery>;
