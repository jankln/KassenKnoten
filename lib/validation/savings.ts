import { z } from "zod";
import type { Messages } from "@/lib/i18n";

/** One euro short of ten million, which is well past any household figure. */
const MAX_AMOUNT_CENTS = 999_999_999;

export const savingsPotInput = (t: Messages) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t.validation.nameRequired)
      .max(60, t.validation.nameTooLong),
    monthlyRateCents: z.coerce
      .number()
      .int(t.validation.amountInvalid)
      .min(0, t.validation.amountNegative)
      .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge),
    balanceCents: z.coerce
      .number()
      .int(t.validation.amountInvalid)
      .min(0, t.validation.amountNegative)
      .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge),
    targetCents: z
      .union([
        z.literal(""),
        z.null(),
        z.coerce
          .number()
          .int(t.validation.amountInvalid)
          .min(1, t.validation.targetPositive)
          .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge),
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
      .max(240, t.validation.noteTooLong)
      .transform((value) => (value === "" ? null : value))
      .optional(),
  });

export type SavingsPotInput = z.infer<ReturnType<typeof savingsPotInput>>;
