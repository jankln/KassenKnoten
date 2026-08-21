import type { ReactNode } from "react";
import { AppHeader } from "@/components/navigation/app-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { Sidebar } from "@/components/navigation/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { requireSession } from "@/lib/auth/current-session";
import { redirect } from "next/navigation";
import { isOnboardingDone } from "@/server/services/household";
import { ensurePreviousMonthSnapshot } from "@/server/services/snapshots";

/**
 * The authenticated frame. Sidebar on wide screens, bottom bar on narrow ones — the same
 * four destinations either way, so the app has one mental model rather than two.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // A second gate behind the proxy: a server action or a mistyped matcher must never be
  // the only thing standing between a stranger and the household's finances. It also
  // makes this segment dynamic, so pages read the database per request instead of being
  // prerendered once at build time.
  await requireSession();
  if (!isOnboardingDone()) {
    redirect("/willkommen");
  }
  try {
    ensurePreviousMonthSnapshot();
  } catch (error) {
    // A history write must never make the authenticated app unavailable.
    console.error("Unable to create the previous month snapshot.", error);
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        {/* Bottom padding clears the mobile bar, which floats above the content. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
      <Toaster />
    </div>
  );
}
