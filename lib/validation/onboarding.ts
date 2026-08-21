import { z } from "zod";
import { de } from "@/lib/i18n/de";
import { MAX_AMOUNT_CENTS, MAX_COLOR_INDEX } from "./member";

export const onboardingIncomeInput = z.object({
  label: z
    .string()
    .trim()
    .min(1, de.validation.labelRequired)
    .max(60, de.validation.labelTooLong),
  kind: z.enum(["salary", "other"]),
  amountCents: z
    .number()
    .int(de.validation.amountInvalid)
    .min(0, de.validation.amountNegative)
    .max(MAX_AMOUNT_CENTS, de.validation.amountTooLarge),
  intervalMonths: z.number().int().min(1).max(60),
});

export const onboardingMemberInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, de.validation.nameRequired)
    .max(40, de.validation.nameTooLong),
  colorIndex: z.number().int().min(1).max(MAX_COLOR_INDEX),
  incomes: z.array(onboardingIncomeInput).optional(),
});

export const onboardingInput = z
  .array(onboardingMemberInput)
  .min(1)
  .max(MAX_COLOR_INDEX);

export type OnboardingInput = z.infer<typeof onboardingInput>;
