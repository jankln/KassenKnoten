import Link from "next/link";
import type { Period } from "@/lib/domain/period";
import { cn } from "@/lib/utils";

/**
 * Privat / Gemeinsam as links rather than client state: the choice survives a reload,
 * can be linked to, and costs no JavaScript. The month travels with it, so switching
 * segments does not silently jump back to today.
 */
export function Segments({
  current,
  period,
  labels,
}: {
  current: "private" | "shared";
  period: Period;
  labels: { private: string; shared: string };
}) {
  const items = [
    {
      key: "private" as const,
      href: `/variable-kosten?monat=${period}`,
      label: labels.private,
    },
    {
      key: "shared" as const,
      href: `/variable-kosten?monat=${period}&bereich=gemeinsam`,
      label: labels.shared,
    },
  ];

  return (
    <nav className="border-line bg-surface-muted mb-5 grid grid-cols-2 gap-1 rounded-full border p-1">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={current === item.key ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-full text-sm font-medium transition-colors sm:min-h-9",
            current === item.key ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
