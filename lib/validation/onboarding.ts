import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { MAX_AMOUNT_CENTS, MAX_COLOR_INDEX } from "./member";

export const onboardingIncomeInput = (t: Messages) =>
  z.object({
    label: z
      .string()
      .trim()
      .min(1, t.validation.labelRequired)
      .max(60, t.validation.labelTooLong),
    kind: z.enum(["salary", "other"]),
    amountCents: z
      .number()
      .int(t.validation.amountInvalid)
      .min(0, t.validation.amountNegative)
      .max(MAX_AMOUNT_CENTS, t.validation.amountTooLarge),
    intervalMonths: z.number().int().min(1).max(60),
  });

export const onboardingMemberInput = (t: Messages) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t.validation.nameRequired)
      .max(40, t.validation.nameTooLong),
    colorIndex: z.number().int().min(1).max(MAX_COLOR_INDEX),
    incomes: z.array(onboardingIncomeInput(t)).optional(),
  });

export const onboardingInput = (t: Messages) =>
  z.array(onboardingMemberInput(t)).min(1).max(MAX_COLOR_INDEX);

export type OnboardingInput = z.infer<ReturnType<typeof onboardingInput>>;
