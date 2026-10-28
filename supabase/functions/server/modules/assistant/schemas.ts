/** Assistant input schema. */
import { z } from "zod";

export const askInput = z
  .object({
    question: z.string().trim().min(3, "Question is too short").max(1000),
    language: z.enum(["en", "sw"]).optional(),
  })
  .strict();

export type AskInput = z.infer<typeof askInput>;
