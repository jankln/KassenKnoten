import { z } from "zod";
import { FULL_SHARE_BP } from "@/lib/domain/money";
import type { Messages } from "@/lib/i18n";
import { refineValidity, validityInput } from "./member";

/** One euro short of ten million, which is well past any household figure. */
const MAX_AMOUNT_CENTS = 999_999_999;

const base = (t: Messages) => ({
  label: z
    .string()
    .trim()
    .min(1, t.validation.labelRequired)
    .max(60, t.validation.labelTooLong),
  amountCents: z.coerce
    .number()
    .int(t.validation.amountInvalid)
    .min(0, t.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge),
  intervalMonths: z.coerce.number().int().min(1).max(60),
  /** Optional on purpose: the first three costs should not require a taxonomy decision. */
  categoryId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional(),
  ...validityInput(t),
});

export const privateExpenseInput = (t: Messages) =>
  z
    .object({
      ...base(t),
      memberId: z.coerce.number().int().positive(),
    })
    .superRefine(refineValidity(t));

export type PrivateExpenseInput = z.infer<ReturnType<typeof privateExpenseInput>>;

const share = z.object({
  memberId: z.coerce.number().int().positive(),
  shareBp: z.coerce.number().int().min(0).max(FULL_SHARE_BP),
});

export const sharedExpenseInput = (t: Messages) =>
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

export type SharedExpenseInput = z.infer<ReturnType<typeof sharedExpenseInput>>;

export const defaultSplitInput = (t: Messages) =>
  z
    .object({
      splitMode: z.enum(["fixed_quota", "income_ratio"]),
      shares: z.array(share).default([]),
    })
    .refine(
      (value) =>
        value.splitMode !== "fixed_quota" ||
        value.shares.length === 0 ||
        value.shares.reduce((total, entry) => total + entry.shareBp, 0) ===
          FULL_SHARE_BP,
      { message: t.validation.sharesMustSum, path: ["shares"] },
    );
