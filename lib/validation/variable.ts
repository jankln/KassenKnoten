import { z } from "zod";
import { FULL_SHARE_BP } from "@/lib/domain/money";
import type { Messages } from "@/lib/i18n";
import { refineValidity, validityInput } from "./member";

/** One euro short of ten million, which is well past any household figure. */
const MAX_AMOUNT_CENTS = 999_999_999;

const amount = (t: Messages) =>
  z.coerce
    .number()
    .int(t.validation.amountInvalid)
    .min(0, t.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge);

const label = (t: Messages) =>
  z
    .string()
    .trim()
    .min(1, t.validation.labelRequired)
    .max(60, t.validation.labelTooLong);

const share = z.object({
  memberId: z.coerce.number().int().positive(),
  shareBp: z.coerce.number().int().min(0).max(FULL_SHARE_BP),
});

const base = (t: Messages) => ({
  label: label(t),
  mode: z.enum(["plan", "detailed"], { message: t.validation.variableModeRequired }),
  plannedCents: amount(t),
  categoryId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional(),
  ...validityInput(t),
});

export const privateVariableCostInput = (t: Messages) =>
  z
    .object({
      ...base(t),
      memberId: z.coerce.number().int().positive(),
    })
    .superRefine(refineValidity(t));

export const sharedVariableCostInput = (t: Messages) =>
  z
    .object({
      ...base(t),
      splitMode: z.enum(["fixed_quota", "income_ratio"], {
        message: t.validation.splitModeRequired,
      }),
      shares: z.array(share).default([]),
    })
    .refine(
      (value) =>
        value.splitMode !== "fixed_quota" ||
        value.shares.reduce((total, entry) => total + entry.shareBp, 0) ===
          FULL_SHARE_BP,
      { message: t.validation.sharesMustSum, path: ["shares"] },
    )
    .superRefine(refineValidity(t));

/**
 * One receipt. The date is a real day rather than a month, because "wann war das?" is
 * the first question anyone asks of a list of amounts — and the month it counts for is
 * derived from it, never entered separately.
 */
export const bookingInput = (t: Messages) =>
  z.object({
    variableCostId: z.coerce.number().int().positive(),
    bookedOn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t.validation.dateInvalid)
      .refine((value) => !Number.isNaN(Date.parse(value)), t.validation.dateInvalid),
    label: z
      .string()
      .trim()
      .max(60, t.validation.labelTooLong)
      .transform((value) => (value === "" ? null : value))
      .optional(),
    amountCents: amount(t),
  });

export type PrivateVariableCostInput = z.infer<
  ReturnType<typeof privateVariableCostInput>
>;
export type SharedVariableCostInput = z.infer<
  ReturnType<typeof sharedVariableCostInput>
>;
export type BookingInput = z.infer<ReturnType<typeof bookingInput>>;
