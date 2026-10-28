/** Community input schemas. */
import { z } from "zod";
import { countyCode } from "../../lib/http.ts";

export const createCommunitySchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(1000).default(""),
    county_code: countyCode,
  })
  .strict();

export const updateCommunitySchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Provide at least one field to update" });

export const listCommunitiesQuery = z
  .object({
    county_code: countyCode.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type ListCommunitiesQuery = z.infer<typeof listCommunitiesQuery>;
