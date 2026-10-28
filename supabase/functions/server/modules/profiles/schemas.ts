/**
 * Profile input schemas. `role` is deliberately absent: users cannot set their
 * own role. `.strict()` rejects unknown keys, including `role`, with a 422.
 */
import { z } from "zod";
import { countyCode } from "../../lib/http.ts";

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120).optional(),
    county_code: countyCode.nullable().optional(),
    preferred_language: z.enum(["en", "sw"]).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Provide at least one field to update" });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
