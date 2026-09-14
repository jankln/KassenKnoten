import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  // Ink on the tint, not brass-ink. Brass-ink is the dark text for a *solid* brass fill;
  // on a 15 % tint over the dark surface it measures 1.4:1 and all but vanishes. Ink
  // reads at 14.8:1 in the light theme and 11.6:1 in the dark one, and the tint alone
  // is enough to say "brass".
  accent: "bg-brass/15 text-ink",
  muted: "bg-surface-muted text-ink-muted",
  negative: "bg-negative/15 text-negative",
} as const;

/** A small status pill next to a name: on/off, active/inactive, a mode. */
export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}
    >
      {children}
    </span>
  );
}
