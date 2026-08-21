"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import { onboardingInput } from "@/lib/validation/onboarding";
import {
  completeOnboarding as completeOnboardingService,
  isOnboardingDone,
} from "@/server/services/household";

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
