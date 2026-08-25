import { z } from "zod";
import { isPeriod } from "@/lib/domain/period";
import type { Messages } from "@/lib/i18n";

/**
 * Shapes shared by the forms and the server actions, so a rule cannot be enforced in one
 * place and forgotten in the other.
 *
 * Every schema is a function of the active messages rather than a constant. They are
 * built once at import, and a message baked in then would be frozen in whichever language
 * happened to be current — unlike the configuration errors in `lib/env.ts`, these are read
 * by the household.
 */

export const MAX_COLOR_INDEX = 5;

/** One euro short of ten million, which is well past any household figure. */
export const MAX_AMOUNT_CENTS = 999_999_999;

/**
 * The months an entry applies to. `validUntil` arrives as an empty string when the form
 * field is left blank, which is the ordinary case — a salary rarely has a planned end.
 */
export const validityInput = (t: Messages) => ({
  validFrom: z.string().refine(isPeriod, t.validation.periodInvalid),
  validUntil: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || isPeriod(value), t.validation.periodInvalid),
});

/** An entry may not stop applying before it starts. */
export function refineValidity(t: Messages) {
  return <T extends { validFrom: string; validUntil: string | null }>(
    value: T,
    ctx: z.RefinementCtx,
  ): void => {
    if (value.validUntil !== null && value.validUntil < value.validFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: t.validation.periodEndBeforeStart,
      });
    }
  };
}

export const memberInput = (t: Messages) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t.validation.nameRequired)
      .max(40, t.validation.nameTooLong),
    colorIndex: z.coerce.number().int().min(1).max(MAX_COLOR_INDEX),
  });

export const incomeInput = (t: Messages) =>
  z
    .object({
      memberId: z.coerce.number().int().positive(),
      label: z
        .string()
        .trim()
        .min(1, t.validation.labelRequired)
        .max(60, t.validation.labelTooLong),
      kind: z.enum(["salary", "other"]),
      amountCents: z.coerce
        .number()
        .int(t.validation.amountInvalid)
        .min(0, t.validation.amountNegative)
        .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge),
      intervalMonths: z.coerce.number().int().min(1).max(60),
      ...validityInput(t),
    })
    .superRefine(refineValidity(t));

export type MemberInput = z.infer<ReturnType<typeof memberInput>>;
export type IncomeInput = z.infer<ReturnType<typeof incomeInput>>;
