"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useMessages } from "@/components/providers/messages-provider";
import { formatCents, formatPeriod } from "@/lib/format";
import type { TrendPoint } from "@/server/services/dashboard";
import { trendLabel, trendSeries } from "./trend-series";

/**
 * The trend, read month by month.
 *
 * The chart used to be a picture with the same numbers repeated as a table underneath.
 * Now it is the way you reach them: a guide line follows the pointer to the nearest month
 * and the readout above says what that month held. Twelve months of history without a
 * navigation or a reload.
 *
 * It is a `slider` rather than an `img`, because that is what it now is — one of twelve
 * months is picked, and the arrow keys pick it too. The SVG stays `aria-hidden`: the
 * semantics live on the control that wraps it, and `aria-valuetext` reads out the whole
 * month rather than a bare index.
 */

/** The drawing box. This is a viewBox, so the numbers are proportions, not pixels. */
const WIDTH = 640;
const HEIGHT = 240;
const PAD = 24;

const clamp = (value: number, last: number) => Math.min(Math.max(value, 0), last);

export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const t = useMessages();
  const copy = t.sections.overview.trend;
  const svgRef = useRef<SVGSVGElement>(null);

  // The last month rather than nothing: the readout is then never empty, `aria-valuenow`
  // always has a value, and the month it starts on is the one the dashboard is about.
  const lastIndex = trend.length - 1;
  const [active, setActive] = useState(lastIndex);

  // A month can drop out of the window while the component is mounted — the dashboard
  // re-renders with a new period without remounting this. Clamping on read is cheaper
  // than an effect that corrects the state afterwards.
  const index = clamp(active, lastIndex);
  const point = trend[index];

  const span = WIDTH - PAD * 2;
  const x = (position: number) => Math.round(PAD + (position * span) / lastIndex);
  const values = trend.flatMap((entry) => trendSeries.map((line) => entry[line.key]));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const y = (value: number) =>
    Math.round(PAD + ((max - value) * (HEIGHT - PAD * 2)) / range);

  /** The month nearest a pointer, in viewBox space rather than screen pixels. */
  function indexAt(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || lastIndex < 1) {
      return index;
    }
    const viewX = ((clientX - rect.left) / rect.width) * WIDTH;
    return clamp(Math.round(((viewX - PAD) * lastIndex) / span), lastIndex);
  }

  function track(event: PointerEvent<HTMLDivElement>) {
    setActive(indexAt(event.clientX));
  }

  function grab(event: PointerEvent<HTMLDivElement>) {
    // A drag that wanders off the chart keeps reporting to it, so the readout does not
    // freeze halfway through a gesture that never left the finger.
    event.currentTarget.setPointerCapture(event.pointerId);
    track(event);
  }

  function step(event: KeyboardEvent<HTMLDivElement>) {
    const by =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 1
          : 0;
    const to = event.key === "Home" ? 0 : event.key === "End" ? lastIndex : null;
    if (by === 0 && to === null) {
      return;
    }
    // Otherwise the arrow keys scroll the page as well as move the guide.
    event.preventDefault();
    // Functional, because a held-down arrow key repeats faster than React re-renders:
    // three presses read from one stale index would all land on the same month.
    setActive((current) => clamp(to ?? clamp(current, lastIndex) + by, lastIndex));
  }

  if (!point) {
    return null;
  }

  const spoken = `${formatPeriod(point.period)}: ${trendSeries
    .map((line) => `${trendLabel(t, line.key)} ${formatCents(point[line.key])}`)
    .join(", ")}`;

  return (
    <div>
      {/* The readout doubles as the legend: every series is named here beside its own
          colour, which is the whole job the separate legend list used to do. */}
      <div className="mb-3">
        <p className="font-display text-sm font-semibold">
          {formatPeriod(point.period)}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-5">
          {trendSeries.map((line) => (
            <div
              key={line.key}
              className={
                // Free cash spans the last row on a phone for the same reason it does in
                // the KPI grid above: it is the figure the month is judged by, and a lone
                // tile in a two-column grid would sit next to a gap.
                line.key === "freeCashCents" ? "col-span-2 lg:col-span-1" : undefined
              }
            >
              <dt className="text-ink-muted flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="truncate">{trendLabel(t, line.key)}</span>
              </dt>
              <dd
                className={`font-ledger tabular mt-1 truncate text-sm font-medium ${
                  line.key === "freeCashCents"
                    ? point[line.key] < 0
                      ? "text-negative"
                      : "text-positive"
                    : ""
                }`}
              >
                {formatCents(point[line.key])}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={copy.scrubLabel}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={index}
        aria-valuetext={spoken}
        onPointerDown={grab}
        onPointerMove={track}
        onKeyDown={step}
        // A horizontal drag scrubs; a vertical one still scrolls the page. A chart that
        // swallows vertical scrolling on a phone is hostile.
        className="bg-surface-muted/35 rounded-control focus-visible:outline-brass min-w-0 touch-pan-y p-2 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-4"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full"
          aria-hidden="true"
          focusable="false"
        >
          <line
            x1={PAD}
            x2={WIDTH - PAD}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-line)"
            strokeDasharray="4 5"
          />
          {/* Drawn before the series so the guide sits behind them rather than across. */}
          <line
            x1={x(index)}
            x2={x(index)}
            y1={PAD}
            y2={HEIGHT - PAD}
            stroke="var(--color-ink-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {trendSeries.map((line) => (
            <polyline
              key={line.key}
              points={trend
                .map((entry, position) => `${x(position)},${y(entry[line.key])}`)
                .join(" ")}
              fill="none"
              pathLength={1}
              stroke={line.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              className="line-draw"
            />
          ))}
          {trendSeries.map((line) =>
            trend.map((entry, position) => (
              <circle
                key={`${line.key}-${entry.period}`}
                cx={x(position)}
                cy={y(entry[line.key])}
                // The picked month's markers carry the reading, so they are the ones
                // drawn at full size; the rest recede to the shape of the line.
                r={position === index ? 6 : 3.5}
                fill="var(--color-surface)"
                stroke={line.color}
                strokeWidth="3"
                className="dot-appear"
              />
            )),
          )}
        </svg>
      </div>

      <p className="text-ink-muted mt-2 text-xs">{copy.scrubHint}</p>
    </div>
  );
}
