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
import { SplitEditor, type SplitMember } from "@/components/patterns/split-editor";
import { ValidityFields } from "@/components/patterns/validity-fields";
import { periodFromDate } from "@/lib/domain/period";
import type { SplitMode } from "@/lib/domain/split";
import type { VariableMode } from "@/lib/domain/variable";
import { parseAmountToCents } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import type { CategoryRow } from "@/server/services/categories";
import type { VariableCostRow } from "@/server/services/variable-costs";
import { ModePicker } from "./mode-picker";
import {
  addPrivateVariableCost,
  addSharedVariableCost,
  editPrivateVariableCost,
  editSharedVariableCost,
} from "./actions";

/**
 * Create or edit one variable budget.
 *
 * Private and shared share this dialog because they differ in exactly two places — who it
 * belongs to, and how it is split — and everything else about them is identical. Two
 * dialogs would have meant two copies of the mode picker, and the mode is the part that
 * needed the most care.
 */
export function VariableCostDialog({
  trigger,
  scope,
  memberId,
  members,
  splitMembers,
  categories,
  defaultMode,
  defaultShares,
  cost,
  defaultFrom,
}: {
  trigger: ReactNode;
  scope: "private" | "shared";
  /** Preselected owner for a private budget. */
  memberId?: number;
  members: { id: number; name: string }[];
  splitMembers: SplitMember[];
  categories: CategoryRow[];
  defaultMode: SplitMode;
  defaultShares: readonly { memberId: number; shareBp: number }[];
  /** Absent when adding a new budget. */
  cost?: VariableCostRow;
  /** The month being viewed, so a new budget starts there rather than today. */
  defaultFrom?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<VariableMode>(cost?.mode ?? "plan");
  const [amountText, setAmountText] = useState(
    cost === undefined ? "" : (cost.plannedCents / 100).toFixed(2).replace(".", ","),
  );
  const [pending, startTransition] = useTransition();

  const copy = de.sections.variableCosts;
  const plannedCents = parseAmountToCents(amountText);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = cost
        ? scope === "private"
          ? await editPrivateVariableCost(cost.id, formData)
          : await editSharedVariableCost(cost.id, formData)
        : scope === "private"
          ? await addPrivateVariableCost(formData)
          : await addSharedVariableCost(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={cost ? copy.editCost : copy.newCost}>
        <form action={submit} className="space-y-4">
          <Field label={copy.costLabel} htmlFor="variable-label" error={error}>
            <Input
              id="variable-label"
              name="label"
              defaultValue={cost?.label}
              placeholder={copy.costLabelPlaceholder}
              maxLength={60}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <ModePicker value={mode} onChange={setMode} />

          <Field
            label={copy.planned}
            htmlFor="variable-planned"
            hint={mode === "detailed" ? copy.plannedHint : undefined}
          >
            <MoneyInput
              id="variable-planned"
              name="plannedCents"
              onTextChange={setAmountText}
              defaultCents={cost?.plannedCents}
              required
            />
          </Field>

          {scope === "private" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={copy.person} htmlFor="variable-member">
                <Select
                  id="variable-member"
                  name="memberId"
                  defaultValue={cost?.memberId ?? memberId}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={copy.category} htmlFor="variable-category">
                <Select
                  id="variable-category"
                  name="categoryId"
                  defaultValue={cost?.categoryId ?? ""}
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
          ) : (
            <>
              <Field label={copy.category} htmlFor="variable-category">
                <Select
                  id="variable-category"
                  name="categoryId"
                  defaultValue={cost?.categoryId ?? ""}
                >
                  <option value="">{copy.noCategory}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* The split is previewed against the planned figure. In `detailed` mode the
                  bookings decide the real amount later, but the quota is the same either
                  way — this shows what the budget divides into. */}
              <SplitEditor
                members={splitMembers}
                amountCents={plannedCents ?? 0}
                defaultMode={cost?.splitMode ?? defaultMode}
                defaultShares={cost?.shares.length ? cost.shares : defaultShares}
              />
            </>
          )}

          <ValidityFields
            defaultFrom={cost?.validFrom ?? defaultFrom ?? periodFromDate(new Date())}
            defaultUntil={cost?.validUntil}
            currentFrom={cost?.validFrom}
            currentAmountCents={cost?.plannedCents}
            amountCents={plannedCents}
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
