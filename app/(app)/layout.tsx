import type { ReactNode } from "react";
import { AppHeader } from "@/components/navigation/app-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { Sidebar } from "@/components/navigation/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { requireSession } from "@/lib/auth/current-session";
import { redirect } from "next/navigation";
import { isOnboardingDone } from "@/server/services/household";
import { ensurePreviousMonthSnapshot } from "@/server/services/snapshots";
import { getMessages } from "@/server/i18n";

/**
 * The authenticated frame. Sidebar on wide screens, bottom bar on narrow ones — the same
 * four destinations either way, so the app has one mental model rather than two.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const t = getMessages();
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
      {/* Every page opens with four navigation links. Without this a keyboard user tabs
          through all of them again on each one. It is the first thing in the DOM and
          invisible until focused. */}
      <a
        href="#inhalt"
        className="focus-visible:bg-surface focus-visible:text-ink focus-visible:border-line focus-visible:rounded-control sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:border focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:shadow-lg"
      >
        {t.nav.skipToContent}
      </a>

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        {/* Bottom padding clears the mobile bar, which floats above the content.
            tabIndex={-1} makes the skip link's target focusable, so the next Tab
            continues inside the content rather than back at the top of the page. The
            outline is suppressed because this is only ever focused programmatically —
            ringing the whole content area would say "you are here" about a region, not
            about anything the user can act on. */}
        <main
          id="inhalt"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <BottomNav />
      <Toaster />
    </div>
  );
}
