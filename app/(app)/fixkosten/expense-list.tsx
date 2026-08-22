"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ValidityNote } from "@/components/patterns/validity-note";
import { periodFromDate } from "@/lib/domain/period";
import { formatCents, formatInterval } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import type { CategoryRow } from "@/server/services/categories";
import type { MemberExpenses } from "@/server/services/expenses";
import { removeExpense, restoreExpenseAction } from "./actions";
import { ExpenseDialog } from "./expense-dialog";

export function MemberExpenseCard({
  group,
  members,
  categories,
}: {
  group: MemberExpenses;
  members: { id: number; name: string }[];
  categories: CategoryRow[];
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
      <header className="flex items-center gap-3 px-5 py-4">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--color-member-${group.colorIndex})` }}
        />
        <h2 className="font-display truncate text-lg font-semibold tracking-tight">
          {group.name}
        </h2>
        <span className="font-ledger tabular ml-auto text-base font-medium">
          {formatCents(group.monthlyCents)}
        </span>
      </header>

      <div className="border-line border-t">
        {group.expenses.length === 0 ? (
          <p className="text-ink-muted px-5 py-4 text-sm">{copy.noneForMember}</p>
        ) : (
          <ul>
            {group.expenses.map((expense) => (
              <li
                key={expense.id}
                className="border-line flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
              >
                <span className="text-ink-muted shrink-0">
                  <CategoryIcon name={expense.categoryIcon ?? "circle-dashed"} />
                </span>

                <div className="min-w-0">
                  {/* Wraps rather than truncates: on a phone a long label is exactly the
                      one people cannot guess from context. */}
                  {/* break-words as well as wrapping: "Hausratversicherung" is one word
                      and would otherwise be cut off mid-letter on a phone. */}
                  <p className="line-clamp-2 text-sm font-medium break-words">
                    {expense.label}
                  </p>
                  {/* Only worth saying when it is not the monthly default. */}
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
                  <ExpenseDialog
                    memberId={group.memberId}
                    members={members}
                    categories={categories}
                    expense={expense}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={copy.editExpense}>
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
              </li>
            ))}
          </ul>
        )}

        <div className="border-line border-t px-3 py-2">
          <ExpenseDialog
            memberId={group.memberId}
            members={members}
            categories={categories}
            trigger={
              <Button variant="ghost" size="sm">
                <Plus className="size-4" aria-hidden />
                {copy.addExpense}
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  );
}
