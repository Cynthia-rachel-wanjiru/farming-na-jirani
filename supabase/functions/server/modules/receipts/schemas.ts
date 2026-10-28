/** Read-receipt schemas. Only forward status changes are allowed; the database enforces that. */
import { z } from "zod";

export const setReceiptSchema = z
  .object({
    status: z.enum(["delivered", "read"]),
  })
  .strict();

export type SetReceiptInput = z.infer<typeof setReceiptSchema>;
