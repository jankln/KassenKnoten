import { z } from "zod";
import { de } from "@/lib/i18n/de";

/** One euro short of ten million, which is well past any household figure. */
const MAX_AMOUNT_CENTS = 999_999_999;

export const savingsPotInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, de.validation.nameRequired)
    .max(60, de.validation.nameTooLong),
  monthlyRateCents: z.coerce
    .number()
    .int(de.validation.amountInvalid)
    .min(0, de.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge),
  balanceCents: z.coerce
    .number()
    .int(de.validation.amountInvalid)
    .min(0, de.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge),
  targetCents: z
    .union([
      z.literal(""),
      z.null(),
      z.coerce
        .number()
        .int(de.validation.amountInvalid)
        .min(1, de.validation.targetPositive)
        .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge),
    ])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional(),
  ownerMemberId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional(),
  note: z
    .string()
    .trim()
    .max(240, de.validation.noteTooLong)
    .transform((value) => (value === "" ? null : value))
    .optional(),
});

export type SavingsPotInput = z.infer<typeof savingsPotInput>;
