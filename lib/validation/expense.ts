import { z } from "zod";
import { de } from "@/lib/i18n/de";

/** One euro short of ten million, which is well past any household figure. */
const MAX_AMOUNT_CENTS = 999_999_999;

const base = {
  label: z
    .string()
    .trim()
    .min(1, de.validation.labelRequired)
    .max(60, de.validation.labelTooLong),
  amountCents: z.coerce
    .number()
    .int(de.validation.amountInvalid)
    .min(0, de.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge),
  intervalMonths: z.coerce.number().int().min(1).max(60),
  /** Optional on purpose: the first three costs should not require a taxonomy decision. */
  categoryId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional(),
};

export const privateExpenseInput = z.object({
  ...base,
  memberId: z.coerce.number().int().positive(),
});

export type PrivateExpenseInput = z.infer<typeof privateExpenseInput>;
