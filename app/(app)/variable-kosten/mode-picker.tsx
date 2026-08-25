"use client";

import { useId } from "react";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import type { VariableMode } from "@/lib/domain/variable";

/**
 * Plan or Detailliert — the one real decision in this form.
 *
 * It is not a segmented control like the split mode, because the two options are not two
 * flavours of the same thing: one means "never think about this again", the other means
 * "I will write down every receipt". Choosing wrongly is annoying to undo, and the words
 * "Plan" and "Detailliert" alone do not carry enough to choose by. So each option gets
 * the sentence that actually distinguishes them, on the card, before the click.
 *
 * Real radio inputs underneath: this is a required choice in a form, keyboard and screen
 * reader behaviour comes for free, and it submits without any JavaScript of its own.
 */
export function ModePicker({
  value,
  onChange,
}: {
  value: VariableMode;
  onChange: (mode: VariableMode) => void;
}) {
  const name = useId();
  const copy = de.sections.variableCosts;

  const options = [
    { value: "plan" as const, label: copy.modePlan, hint: copy.modePlanHint },
    {
      value: "detailed" as const,
      label: copy.modeDetailed,
      hint: copy.modeDetailedHint,
    },
  ];

  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium">{copy.mode}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "rounded-control cursor-pointer border p-3 transition-colors",
                checked
                  ? "border-brass bg-brass/10"
                  : "border-line bg-surface hover:bg-surface-muted",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${name}-mode`}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(option.value)}
                  className="size-4 accent-[var(--color-brass)]"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </span>
              <span className="text-ink-muted mt-1.5 block text-xs leading-relaxed">
                {option.hint}
              </span>
            </label>
          );
        })}
      </div>
      {/* The radios above are controlled and share a generated name; this is what the
          server action reads, so the field name stays stable and predictable. */}
      <input type="hidden" name="mode" value={value} />
    </fieldset>
  );
}
