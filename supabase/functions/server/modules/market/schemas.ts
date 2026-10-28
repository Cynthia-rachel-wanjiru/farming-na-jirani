/** Market price schemas. */
import { z } from "zod";
import { countyCode } from "../../lib/http.ts";

export const publishPriceSchema = z
  .object({
    crop: z.string().trim().min(2).max(80),
    market_name: z.string().trim().min(2).max(120),
    county_code: countyCode,
    unit: z.string().trim().min(1).max(40).default("90kg bag"),
    price_kes: z.number().nonnegative().max(10_000_000),
    observed_on: z.string().date().optional(),
    source: z.enum(["community", "cooperative", "official"]).default("community"),
  })
  .strict();

export const listPricesQuery = z
  .object({
    crop: z.string().trim().min(2).max(80).optional(),
    county_code: countyCode.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type PublishPriceInput = z.infer<typeof publishPriceSchema>;
export type ListPricesQuery = z.infer<typeof listPricesQuery>;
