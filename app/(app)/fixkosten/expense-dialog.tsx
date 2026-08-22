"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { formatInterval } from "@/lib/format";
import { ValidityFields } from "@/components/patterns/validity-fields";
import { periodFromDate } from "@/lib/domain/period";
import { de } from "@/lib/i18n/de";
import type { CategoryRow } from "@/server/services/categories";
import type { ExpenseRow } from "@/server/services/expenses";
import { addPrivateExpense, editPrivateExpense } from "./actions";

/** The rhythms a fixed cost is actually charged in. */
const INTERVALS = [1, 3, 6, 12] as const;

export function ExpenseDialog({
  trigger,
  memberId,
  members,
  categories,
  expense,
}: {
  trigger: ReactNode;
  memberId: number;
  members: { id: number; name: string }[];
  categories: CategoryRow[];
  /** Absent when adding a new cost. */
  expense?: ExpenseRow;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = expense
        ? await editPrivateExpense(expense.id, formData)
        : await addPrivateExpense(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  const copy = de.sections.fixedCosts;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={expense ? copy.editExpense : copy.newExpense}>
        <form action={submit} className="space-y-4">
          <Field label={copy.expenseLabel} htmlFor="expense-label" error={error}>
            <Input
              id="expense-label"
              name="label"
              defaultValue={expense?.label}
              placeholder={copy.expenseLabelPlaceholder}
              maxLength={60}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <Field label={de.sections.household.amount} htmlFor="expense-amount">
            <MoneyInput
              id="expense-amount"
              name="amountCents"
              defaultCents={expense?.amountCents}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={de.sections.household.interval} htmlFor="expense-interval">
              <Select
                id="expense-interval"
                name="intervalMonths"
                defaultValue={expense?.intervalMonths ?? 1}
              >
                {INTERVALS.map((months) => (
                  <option key={months} value={months}>
                    {formatInterval(months)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={copy.person} htmlFor="expense-member">
              <Select id="expense-member" name="memberId" defaultValue={memberId}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={copy.category} htmlFor="expense-category">
            <Select
              id="expense-category"
              name="categoryId"
              defaultValue={expense?.categoryId ?? ""}
            >
              <option value="">{copy.noCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <ValidityFields
            defaultFrom={expense?.validFrom ?? periodFromDate(new Date())}

            defaultUntil={expense?.validUntil}

            currentFrom={expense?.validFrom}
          />

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {de.actions.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {de.actions.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
