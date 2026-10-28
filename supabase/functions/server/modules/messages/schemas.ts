/** Echo message schemas. */
import { z } from "zod";

export const postMessageSchema = z
  .object({
    body: z.string().trim().min(1, "Message cannot be empty").max(2000),
  })
  .strict();

export const listMessagesQuery = z
  .object({
    /** Cursor: return messages strictly older than this ISO timestamp. */
    before: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type PostMessageInput = z.infer<typeof postMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuery>;
