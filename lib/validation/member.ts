import { z } from "zod";
import { de } from "@/lib/i18n/de";

/**
 * Shapes shared by the forms and the server actions, so a rule cannot be enforced in one
 * place and forgotten in the other. Messages are German because they are shown in the
 * interface, unlike the configuration errors in `lib/env.ts`.
 */

export const MAX_COLOR_INDEX = 5;

/** One euro short of ten million, which is well past any household figure. */
export const MAX_AMOUNT_CENTS = 999_999_999;

export const memberInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, de.validation.nameRequired)
    .max(40, de.validation.nameTooLong),
  colorIndex: z.coerce.number().int().min(1).max(MAX_COLOR_INDEX),
});

export const incomeInput = z.object({
  memberId: z.coerce.number().int().positive(),
  label: z
    .string()
    .trim()
    .min(1, de.validation.labelRequired)
    .max(60, de.validation.labelTooLong),
  kind: z.enum(["salary", "other"]),
  amountCents: z.coerce
    .number()
    .int(de.validation.amountInvalid)
    .min(0, de.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge),
  intervalMonths: z.coerce.number().int().min(1).max(60),
});

export type MemberInput = z.infer<typeof memberInput>;
export type IncomeInput = z.infer<typeof incomeInput>;
