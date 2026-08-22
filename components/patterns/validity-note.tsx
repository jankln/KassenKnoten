import { formatPeriod } from "@/lib/format";
import { de } from "@/lib/i18n/de";

/**
 * When an entry applies, shown only when that is not simply "now and onwards".
 *
 * Most entries run from some point in the past with no end, and saying so on every row
 * would be noise on a screen that is mostly numbers. What earns a line is an entry that
 * has not started yet or has already stopped — the two cases where the list would
 * otherwise disagree with the month on the dashboard.
 */
export function ValidityNote({
  validFrom,
  validUntil,
  currentPeriod,
}: {
  validFrom: string;
  validUntil: string | null;
  /** The month the reader is looking at, normally today. */
  currentPeriod: string;
}) {
  const copy = de.validity;
  const notStarted = validFrom > currentPeriod;
  const ended = validUntil !== null && validUntil < currentPeriod;

  if (!notStarted && validUntil === null) {
    return null;
  }

  const text =
    validUntil === null
      ? copy.since(formatPeriod(validFrom))
      : validFrom === validUntil
        ? formatPeriod(validFrom)
        : copy.range(formatPeriod(validFrom), formatPeriod(validUntil));

  return (
    <span
      className={
        notStarted || ended
          ? "border-line text-ink-muted rounded-full border px-2 py-0.5 text-xs"
          : "text-ink-muted text-xs"
      }
    >
      {text}
    </span>
  );
}
