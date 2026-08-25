"use client";

import { useState, useTransition, type ReactNode } from "react";
import { SplitEditor, type SplitMember } from "@/components/patterns/split-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import type { SplitMode } from "@/lib/domain/split";
import { formatInterval, parseAmountToCents } from "@/lib/format";
import { ValidityFields } from "@/components/patterns/validity-fields";
import { periodFromDate } from "@/lib/domain/period";
import type { CategoryRow } from "@/server/services/categories";
import type { SharedExpenseRow } from "@/server/services/expenses";
import { addSharedExpense, editSharedExpense } from "./actions";
import { useMessages } from "@/components/providers/messages-provider";

const INTERVALS = [1, 3, 6, 12] as const;

export function SharedExpenseDialog({
  trigger,
  members,
  categories,
  defaultMode,
  defaultShares,
  expense,
}: {
  trigger: ReactNode;
  members: SplitMember[];
  categories: CategoryRow[];
  defaultMode: SplitMode;
  defaultShares: readonly { memberId: number; shareBp: number }[];
  expense?: SharedExpenseRow;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Mirrored so the split preview can react to the amount as it is typed.
  const [amountText, setAmountText] = useState(
    expense ? (expense.amountCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [intervalMonths, setIntervalMonths] = useState(expense?.intervalMonths ?? 1);

  const typedCents = parseAmountToCents(amountText) ?? 0;
  const previewCents = Math.round(typedCents / intervalMonths);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = expense
        ? await editSharedExpense(expense.id, formData)
        : await addSharedExpense(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  const copy = t.sections.fixedCosts;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={expense ? copy.editShared : copy.newShared}
        className="sm:max-w-lg"
      >
        <form
          action={submit}
          className="max-h-[70vh] space-y-4 overflow-y-auto sm:max-h-none"
        >
          <Field label={copy.expenseLabel} htmlFor="shared-label">
            <Input
              id="shared-label"
              name="label"
              defaultValue={expense?.label}
              placeholder="z. B. Miete"
              maxLength={60}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <Field label={t.sections.household.amount} htmlFor="shared-amount">
            <MoneyInput
              id="shared-amount"
              name="amountCents"
              defaultCents={expense?.amountCents}
              onTextChange={setAmountText}
              required
            />
          </Field>

          {/* Stacked on a phone: two native selects side by side clip their own
              option text at 375 px. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.sections.household.interval} htmlFor="shared-interval">
              <Select
                id="shared-interval"
                name="intervalMonths"
                defaultValue={intervalMonths}
                onChange={(event) => setIntervalMonths(Number(event.target.value))}
              >
                {INTERVALS.map((months) => (
                  <option key={months} value={months}>
                    {formatInterval(months, t)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={copy.category} htmlFor="shared-category">
              <Select
                id="shared-category"
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
          </div>

          <SplitEditor
            members={members}
            amountCents={previewCents}
            defaultMode={expense?.splitMode ?? defaultMode}
            defaultShares={expense?.shares.length ? expense.shares : defaultShares}
            error={error}
          />

          <ValidityFields
            defaultFrom={expense?.validFrom ?? periodFromDate(new Date())}

            defaultUntil={expense?.validUntil}

            currentFrom={expense?.validFrom}
            currentAmountCents={expense?.amountCents}
            amountCents={parseAmountToCents(amountText)}
          />

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t.actions.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {t.actions.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
