import type { ReactNode } from "react";
import { KnotMark } from "@/components/brand/knot-mark";

/**
 * An empty screen is an invitation, not a dead end: it says what belongs here and offers
 * the one action that fills it.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line rounded-card flex flex-col items-center border border-dashed px-6 py-14 text-center">
      <KnotMark className="mb-5 h-10 w-10 opacity-45" />
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="text-ink-muted mt-2 max-w-sm text-sm leading-relaxed text-balance">
        {body}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
