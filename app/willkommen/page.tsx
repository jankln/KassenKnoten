import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KnotMark } from "@/components/brand/knot-mark";
import { requireSession } from "@/lib/auth/current-session";
import { isOnboardingDone } from "@/server/services/household";
import { OnboardingWizard } from "./onboarding-wizard";
import { getLocale, getMessages } from "@/server/i18n";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.onboarding.title };
}

export default async function WelcomePage() {
  await requireSession();
  if (isOnboardingDone()) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-1 items-start justify-center px-4 py-8 sm:items-center">
      <div className="w-full">
        <div className="mb-6 flex justify-center">
          <KnotMark className="size-12" />
        </div>
        <OnboardingWizard locale={getLocale()} />
      </div>
    </main>
  );
}
