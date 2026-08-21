import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { KnotMark } from "@/components/brand/knot-mark";
import { Button, buttonStyles } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { de } from "@/lib/i18n/de";

/**
 * The bar above the content. On a phone it also carries the wordmark, because the
 * sidebar that normally holds it is not there — and sign-out shrinks to an icon, because
 * at 375 px the label is what pushes the row over the edge.
 *
 * Theme lives in Einstellungen, not here: it is a setting, not a per-screen control.
 */
export function AppHeader() {
  return (
    <header className="border-line bg-canvas/90 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <KnotMark className="h-6 w-6" />
        <span className="font-display font-semibold tracking-tight">{de.app.name}</span>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/einstellungen"
          aria-label={de.nav.settings}
          className={buttonStyles({ variant: "ghost", size: "icon" })}
        >
          <Settings className="size-[18px]" aria-hidden />
        </Link>

        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label={de.actions.signOut}
            className="sm:hidden"
          >
            <LogOut className="size-[18px]" aria-hidden />
          </Button>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            {de.actions.signOut}
          </Button>
        </form>
      </div>
    </header>
  );
}
