import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { nextPeriod, previousPeriod, type Period } from "@/lib/domain/period";
import { formatPeriod } from "@/lib/format";
import { getMessages } from "@/server/i18n";

/**
 * Step through the months.
 *
 * Plain links, so the month survives a reload, can be shared, and works before any
 * JavaScript arrives. Both directions stay open: the future is worth looking at when a
 * raise or a contract has already been entered with a later start.
 *
 * The caller builds the links, because each screen carries different company in the
 * query string — the variable-cost screen has to keep its Privat/Gemeinsam segment while
 * the month changes underneath it.
 */
export function MonthNav({
  period,
  today,
  hrefFor,
}: {
  period: Period;
  today: Period;
  hrefFor: (period: Period) => string;
}) {
  const t = getMessages();
  const copy = t.months;
  return (
    <nav
      aria-label={copy.current}
      className="border-line bg-surface rounded-card mb-6 flex items-center justify-between gap-2 border p-1.5"
    >
      <Link
        href={hrefFor(previousPeriod(period))}
        aria-label={copy.previous}
        className={buttonStyles({ variant: "ghost", size: "icon" })}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Link>

      <p className="font-display min-w-0 truncate text-center text-base font-semibold">
        {formatPeriod(period)}
      </p>

      <div className="flex items-center gap-1">
        {period === today ? null : (
          <Link
            href={hrefFor(today)}
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            {copy.today}
          </Link>
        )}
        <Link
          href={hrefFor(nextPeriod(period))}
          aria-label={copy.next}
          className={buttonStyles({ variant: "ghost", size: "icon" })}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
