/** Voting proposal and vote schemas. */
import { z } from "zod";

const MIN_TITLE = 5;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 4000;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const MAX_OPTION_LABEL = 200;

export const createProposalSchema = z
  .object({
    title: z.string().trim().min(MIN_TITLE).max(MAX_TITLE),
    description: z.string().trim().max(MAX_DESCRIPTION).default(""),
    options: z
      .array(z.string().trim().min(1).max(MAX_OPTION_LABEL))
      .min(MIN_OPTIONS)
      .max(MAX_OPTIONS)
      .refine((opts) => new Set(opts.map((o) => o.toLowerCase())).size === opts.length, {
        message: "Options must be unique",
      }),
    opens_at: z.string().datetime({ offset: true }).optional(),
    closes_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine(
    (v) => !v.opens_at || new Date(v.closes_at).getTime() > new Date(v.opens_at).getTime(),
    { message: "closes_at must be after opens_at", path: ["closes_at"] },
  )
  .refine((v) => new Date(v.closes_at).getTime() > Date.now(), {
    message: "closes_at must be in the future",
    path: ["closes_at"],
  });

export const castVoteSchema = z
  .object({
    option_id: z.string().uuid(),
  })
  .strict();

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
