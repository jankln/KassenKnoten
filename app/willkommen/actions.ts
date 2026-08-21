"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import {
  completeOnboarding as completeOnboardingService,
  isOnboardingDone,
} from "@/server/services/household";
import { MAX_AMOUNT_CENTS, MAX_COLOR_INDEX } from "@/lib/validation/member";

const onboardingIncome = z.object({
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

const onboardingMember = z.object({
  name: z
    .string()
    .trim()
    .min(1, de.validation.nameRequired)
    .max(40, de.validation.nameTooLong),
  colorIndex: z.number().int().min(1).max(MAX_COLOR_INDEX),
  income: onboardingIncome.optional(),
});

const onboardingInput = z.array(onboardingMember).min(1).max(MAX_COLOR_INDEX);

export interface OnboardingActionResult {
  error?: string;
}

export async function completeOnboarding(
  formData: FormData,
): Promise<OnboardingActionResult> {
  await requireSession();

  if (isOnboardingDone()) {
    redirect("/");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("members") ?? "[]"));
  } catch {
    return { error: de.validation.failed };
  }

  const parsed = onboardingInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  completeOnboardingService(parsed.data);
  redirect("/");
}
