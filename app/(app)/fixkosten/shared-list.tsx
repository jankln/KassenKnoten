"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import type { SplitMember } from "@/components/patterns/split-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { SplitMode } from "@/lib/domain/split";
import { ValidityNote } from "@/components/patterns/validity-note";
import { periodFromDate } from "@/lib/domain/period";
import { formatCents, formatInterval, formatShareBp } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import type { CategoryRow } from "@/server/services/categories";
import type { SharedExpenseRow } from "@/server/services/expenses";
import { removeExpense, restoreExpenseAction } from "./actions";
import { SharedExpenseDialog } from "./shared-dialog";

export function SharedExpenseList({
  expenses,
  members,
  categories,
  defaultMode,
  defaultShares,
}: {
  expenses: SharedExpenseRow[];
  members: SplitMember[];
  categories: CategoryRow[];
  defaultMode: SplitMode;
  defaultShares: readonly { memberId: number; shareBp: number }[];
}) {
  const [, startTransition] = useTransition();
  const copy = de.sections.fixedCosts;
  const currentPeriod = periodFromDate(new Date());

  function drop(id: number) {
    startTransition(async () => {
      await removeExpense(id);
      toast(copy.expenseRemoved, {
        action: {
          label: de.actions.undo,
          onClick: () => startTransition(() => void restoreExpenseAction(id)),
        },
      });
    });
  }

  return (
    <Card className="p-0">
      <ul>
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="border-line border-b px-5 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-ink-muted shrink-0">
                <CategoryIcon name={expense.categoryIcon ?? "circle-dashed"} />
              </span>

              <div className="min-w-0">
                {/* break-words as well as wrapping: "Hausratversicherung" is one word
                      and would otherwise be cut off mid-letter on a phone. */}
                <p className="line-clamp-2 text-sm font-medium break-words">
                  {expense.label}
                </p>
                <p className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {expense.intervalMonths !== 1 ? (
                    <span>
                      {formatCents(expense.amountCents)} ·{" "}
                      {formatInterval(expense.intervalMonths)}
                    </span>
                  ) : null}
                  <ValidityNote
                    validFrom={expense.validFrom}
                    validUntil={expense.validUntil}
                    currentPeriod={currentPeriod}
                  />
                </p>
              </div>

              <span className="font-ledger tabular ml-auto text-sm">
                {formatCents(expense.monthlyCents)}
              </span>

              <div className="flex shrink-0 items-center">
                <SharedExpenseDialog
                  members={members}
                  categories={categories}
                  defaultMode={defaultMode}
                  defaultShares={defaultShares}
                  expense={expense}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={copy.editShared}>
                      <Pencil className="size-3.5" aria-hidden />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.removeExpense}
                  onClick={() => drop(expense.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>

            {/* Who carries what, on every row: the split is the point of this list. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[30px]">
              {expense.perMember.map((share) => (
                <span
                  key={share.memberId}
                  className="text-ink-muted flex items-center gap-1.5 text-xs"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: `var(--color-member-${
                        members.find((member) => member.id === share.memberId)
                          ?.colorIndex ?? 1
                      })`,
                    }}
                  />
                  {share.name}
                  <span className="font-ledger tabular">
                    {formatCents(share.cents)}
                  </span>
                  <span>({formatShareBp(share.shareBp)})</span>
                </span>
              ))}
              {expense.splitMode === "income_ratio" ? (
                <span className="text-ink-muted text-xs">· {copy.splitIncome}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="border-line border-t px-3 py-2">
        <SharedExpenseDialog
          members={members}
          categories={categories}
          defaultMode={defaultMode}
          defaultShares={defaultShares}
          trigger={
            <Button variant="ghost" size="sm">
              <Plus className="size-4" aria-hidden />
              {copy.addShared}
            </Button>
          }
        />
      </div>
    </Card>
  );
}
