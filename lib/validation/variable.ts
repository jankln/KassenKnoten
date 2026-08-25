import { z } from "zod";
import { FULL_SHARE_BP } from "@/lib/domain/money";
import { de } from "@/lib/i18n/de";
import { refineValidity, validityInput } from "./member";

/** One euro short of ten million, which is well past any household figure. */
const MAX_AMOUNT_CENTS = 999_999_999;

const amount = z.coerce
  .number()
  .int(de.validation.amountInvalid)
  .min(0, de.validation.amountNegative)
  .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge);

const label = z
  .string()
  .trim()
  .min(1, de.validation.labelRequired)
  .max(60, de.validation.labelTooLong);

const share = z.object({
  memberId: z.coerce.number().int().positive(),
  shareBp: z.coerce.number().int().min(0).max(FULL_SHARE_BP),
});

const base = {
  label,
  mode: z.enum(["plan", "detailed"], { message: de.validation.variableModeRequired }),
  plannedCents: amount,
  categoryId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional(),
  ...validityInput,
};

export const privateVariableCostInput = z
  .object({
    ...base,
    memberId: z.coerce.number().int().positive(),
  })
  .superRefine(refineValidity);

export const sharedVariableCostInput = z
  .object({
    ...base,
    splitMode: z.enum(["fixed_quota", "income_ratio"], {
      message: de.validation.splitModeRequired,
    }),
    shares: z.array(share).default([]),
  })
  .refine(
    (value) =>
      value.splitMode !== "fixed_quota" ||
      value.shares.reduce((total, entry) => total + entry.shareBp, 0) === FULL_SHARE_BP,
    { message: de.validation.sharesMustSum, path: ["shares"] },
  )
  .superRefine(refineValidity);

/**
 * One receipt. The date is a real day rather than a month, because "wann war das?" is
 * the first question anyone asks of a list of amounts — and the month it counts for is
 * derived from it, never entered separately.
 */
export const bookingInput = z.object({
  variableCostId: z.coerce.number().int().positive(),
  bookedOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, de.validation.dateInvalid)
    .refine((value) => !Number.isNaN(Date.parse(value)), de.validation.dateInvalid),
  label: z
    .string()
    .trim()
    .max(60, de.validation.labelTooLong)
    .transform((value) => (value === "" ? null : value))
    .optional(),
  amountCents: amount,
});

export type PrivateVariableCostInput = z.infer<typeof privateVariableCostInput>;
export type SharedVariableCostInput = z.infer<typeof sharedVariableCostInput>;
export type BookingInput = z.infer<typeof bookingInput>;
