import { z } from "zod";
import { FULL_SHARE_BP } from "@/lib/domain/money";
import { de } from "@/lib/i18n/de";
import { refineValidity, validityInput } from "./member";

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
  ...validityInput,
};

export const privateExpenseInput = z
  .object({
    ...base,
    memberId: z.coerce.number().int().positive(),
  })
  .superRefine(refineValidity);

export type PrivateExpenseInput = z.infer<typeof privateExpenseInput>;

const share = z.object({
  memberId: z.coerce.number().int().positive(),
  shareBp: z.coerce.number().int().min(0).max(FULL_SHARE_BP),
});

export const sharedExpenseInput = z
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

export type SharedExpenseInput = z.infer<typeof sharedExpenseInput>;

export const defaultSplitInput = z
  .object({
    splitMode: z.enum(["fixed_quota", "income_ratio"]),
    shares: z.array(share).default([]),
  })
  .refine(
    (value) =>
      value.splitMode !== "fixed_quota" ||
      value.shares.length === 0 ||
      value.shares.reduce((total, entry) => total + entry.shareBp, 0) === FULL_SHARE_BP,
    { message: de.validation.sharesMustSum, path: ["shares"] },
  );
