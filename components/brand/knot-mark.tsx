import { cn } from "@/lib/utils";

/**
 * The Knoten.
 *
 * Two strands, one per person, linked into a single knot: two incomes tied into one
 * household. The strands are the same device the app uses to show a split, which is why
 * they carry the member colours and why they are not the same width — a household is
 * never exactly even, and pretending otherwise is the spreadsheet's habit, not ours.
 *
 * The weave is real: the first strand passes over at the top crossing and under at the
 * bottom one. Two linked rings that do not interlace are just two rings.
 */
export function KnotMark({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <defs>
        {/* The rings cross at (32, 20.51) and (32, 43.49). Each mask opens a gap just
            wide enough for the strand passing over — no wider, or the gap shows. */}
        <mask id="knot-over-top">
          <rect width="64" height="64" fill="white" />
          <circle cx="32" cy="20.51" r="5.6" fill="black" />
        </mask>
        <mask id="knot-over-bottom">
          <rect width="64" height="64" fill="white" />
          <circle cx="32" cy="43.49" r="4.4" fill="black" />
        </mask>
      </defs>

      <g
        className={cn(
          animate &&
            "[&_circle]:animate-[knot-draw_800ms_cubic-bezier(0.16,1,0.3,1)_both]",
        )}
      >
        <circle
          cx="24"
          cy="32"
          r="14"
          stroke="var(--color-member-1)"
          strokeWidth="8"
          pathLength={1}
          strokeDasharray={1}
        />
        <circle
          cx="40"
          cy="32"
          r="14"
          stroke="var(--color-member-2)"
          strokeWidth="6"
          mask="url(#knot-over-top)"
          pathLength={1}
          strokeDasharray={1}
          style={{ animationDelay: "140ms" }}
        />
        {/* Redraw the first strand without the bottom crossing, so the second passes
            over there and the two genuinely interlock. */}
        <circle
          cx="24"
          cy="32"
          r="14"
          stroke="var(--color-member-1)"
          strokeWidth="8"
          mask="url(#knot-over-bottom)"
          pathLength={1}
          strokeDasharray={1}
        />
      </g>
    </svg>
  );
}
