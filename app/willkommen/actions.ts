"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/current-session";
import { onboardingInput } from "@/lib/validation/onboarding";
import {
  completeOnboarding as completeOnboardingService,
  isOnboardingDone,
} from "@/server/services/household";
import { getMessages } from "@/server/i18n";

export interface OnboardingActionResult {
  error?: string;
}

export async function completeOnboarding(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const t = getMessages();
  await requireSession();

  if (isOnboardingDone()) {
    redirect("/");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("members") ?? "[]"));
  } catch {
    return { error: t.validation.failed };
  }

  const parsed = onboardingInput(getMessages()).safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.validation.failed };
  }

  completeOnboardingService(parsed.data);
  redirect("/");
}
