"use client";

import type { CSSProperties } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ValidityNote } from "@/components/patterns/validity-note";
import type { SplitMember } from "@/components/patterns/split-editor";
import type { SplitMode } from "@/lib/domain/split";
import type { Period } from "@/lib/domain/period";
import { formatCents, formatDay, formatShareBp } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/server/services/categories";
import type { VariableCostRow } from "@/server/services/variable-costs";
import { BookingDialog } from "./booking-dialog";
import { VariableCostDialog } from "./cost-dialog";
import {
  removeBooking,
  removeVariableCost,
  restoreBookingAction,
  restoreVariableCostAction,
} from "./actions";

/**
 * One budget for one month.
 *
 * The card has to answer three questions at a glance, in this order: what does this cost
 * the household this month, is that the plan or the receipts, and — when receipts are
 * what counts — how far through the budget the month is. So the counted figure is the
 * headline and the mode sits next to the name as a badge rather than buried in a dialog.
 *
 * The budget bar appears only when there is something to measure. In plan mode nobody is
 * booking receipts, so a bar at 0 % with "Übrig: 120,00 €" would promise money that has
 * already been counted as spent. A budget that was switched back to plan mode with its
 * receipts still attached does show it, because then the comparison is real again.
 */
export function CostCard({
  cost,
  period,
  members,
  splitMembers,
  categories,
  defaultMode,
  defaultShares,
}: {
  cost: VariableCostRow;
  period: Period;
  members: { id: number; name: string }[];
  splitMembers: SplitMember[];
  categories: CategoryRow[];
  defaultMode: SplitMode;
  defaultShares: readonly { memberId: number; shareBp: number }[];
}) {
  const [, startTransition] = useTransition();
  const copy = de.sections.variableCosts;
  const detailed = cost.mode === "detailed";
  const over = cost.remainingCents < 0;
  const showBudget = detailed || cost.bookedCents > 0;

  function dropCost() {
    startTransition(async () => {
      await removeVariableCost(cost.id);
      toast(copy.costRemoved, {
        action: {
          label: de.actions.undo,
          onClick: () => startTransition(() => void restoreVariableCostAction(cost.id)),
        },
      });
    });
  }

  function dropBooking(id: number) {
    startTransition(async () => {
      await removeBooking(id);
      toast(copy.bookingRemoved, {
        action: {
          label: de.actions.undo,
          onClick: () => startTransition(() => void restoreBookingAction(id)),
        },
      });
    });
  }

  return (
    <Card className="p-0">
      <header className="flex items-start gap-3 px-5 py-4">
        <span className="text-ink-muted mt-0.5 shrink-0">
          <CategoryIcon name={cost.categoryIcon ?? "circle-dashed"} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-base font-semibold break-words">
              {cost.label}
            </h3>
            <ModeBadge detailed={detailed} />
          </div>
          <p className="text-ink-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>{detailed ? copy.countsDetailed : copy.countsPlan}</span>
            <ValidityNote
              validFrom={cost.validFrom}
              validUntil={cost.validUntil}
              currentPeriod={period}
            />
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <VariableCostDialog
            scope={cost.scope}
            memberId={cost.memberId ?? undefined}
            members={members}
            splitMembers={splitMembers}
            categories={categories}
            defaultMode={defaultMode}
            defaultShares={defaultShares}
            cost={cost}
            trigger={
              <Button variant="ghost" size="icon" aria-label={copy.editCost}>
                <Pencil className="size-3.5" aria-hidden />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={copy.removeCost}
            onClick={dropCost}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="border-line border-t px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-ledger tabular text-xl font-semibold">
            {formatCents(cost.countedCents)}
          </span>
          <span className="text-ink-muted text-xs">
            {!showBudget
              ? copy.countsPlan
              : cost.plannedCents > 0
                ? `${formatCents(cost.bookedCents)} ${copy.ofPlanned(formatCents(cost.plannedCents))}`
                : copy.noBudget}
          </span>
        </div>

        {!showBudget || cost.usageBp === null ? null : (
          <>
            <div
              className="bg-surface-muted mt-3 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(cost.usageBp / 100)}
              aria-label={copy.booked}
            >
              <div
                className={cn(
                  "bar-grow h-full rounded-full",
                  over ? "bg-negative" : "bg-brass",
                )}
                style={
                  {
                    width: `${Math.min(100, cost.usageBp / 100)}%`,
                  } as CSSProperties
                }
              />
            </div>
            <p
              className={cn(
                "mt-2 text-xs",
                over ? "text-negative font-medium" : "text-ink-muted",
              )}
            >
              {over
                ? `${copy.over}: ${formatCents(-cost.remainingCents)}`
                : `${copy.remaining}: ${formatCents(cost.remainingCents)}`}
            </p>
          </>
        )}

        {cost.perMember.length > 0 ? (
          <ul className="border-line mt-4 space-y-1.5 border-t pt-3">
            {cost.perMember.map((share) => (
              <li key={share.memberId} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 truncate">{share.name}</span>
                <span className="text-ink-muted shrink-0">
                  {formatShareBp(share.shareBp)}
                </span>
                <span className="font-ledger tabular ml-auto shrink-0">
                  {formatCents(share.cents)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {detailed ? (
        <div className="border-line border-t">
          <h4 className="text-ink-muted px-5 pt-3 text-xs font-medium">
            {copy.bookings}
          </h4>
          {cost.bookings.length === 0 ? (
            <p className="text-ink-muted px-5 py-3 text-sm">{copy.noBookings}</p>
          ) : (
            <ul className="mt-1">
              {cost.bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="border-line flex items-center gap-3 border-t px-5 py-2.5"
                >
                  <span className="font-ledger tabular text-ink-muted w-12 shrink-0 text-xs">
                    {formatDay(booking.bookedOn)}
                  </span>
                  {/* Wraps rather than truncates: at 375 px a row of date, amount and
                      two 44 px touch targets leaves little for the label, and "Großein…"
                      is exactly the part nobody can reconstruct from context. */}
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm break-words">
                    {booking.label ?? cost.label}
                  </span>
                  <span className="font-ledger tabular shrink-0 text-sm">
                    {formatCents(booking.amountCents)}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <BookingDialog
                      variableCostId={cost.id}
                      defaultDate={booking.bookedOn}
                      booking={booking}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={copy.editBooking}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={copy.removeBooking}
                      onClick={() => dropBooking(booking.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-line border-t px-3 py-2">
            <BookingDialog
              variableCostId={cost.id}
              defaultDate={defaultDateFor(period)}
              trigger={
                <Button variant="ghost" size="sm">
                  <Plus className="size-4" aria-hidden />
                  {copy.addBooking}
                </Button>
              }
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ModeBadge({ detailed }: { detailed: boolean }) {
  const copy = de.sections.variableCosts;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        detailed ? "bg-surface-muted text-ink-muted" : "bg-brass/15 text-brass-ink",
      )}
    >
      {detailed ? copy.modeBadgeDetailed : copy.modeBadgePlan}
    </span>
  );
}

/**
 * The day a new receipt starts on: today when the screen shows the current month, and
 * the first of the month otherwise. Entering last month's receipts should not mean
 * correcting the date on every one of them.
 */
function defaultDateFor(period: Period): string {
  const today = new Date();
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (period === currentPeriod) {
    return `${currentPeriod}-${String(today.getDate()).padStart(2, "0")}`;
  }
  return `${period}-01`;
}
