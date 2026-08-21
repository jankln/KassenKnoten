"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { addCategory, editCategory } from "./actions";

export function CategoryDialog({
  trigger,
  category,
}: {
  trigger: ReactNode;
  /** Absent when adding a new one. */
  category?: { id: number; name: string; icon: string };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [icon, setIcon] = useState(category?.icon ?? "circle-dashed");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = category
        ? await editCategory(category.id, formData)
        : await addCategory(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  const copy = de.sections.settings;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={category ? copy.editCategory : copy.newCategory}>
        <form action={submit} className="space-y-5">
          <Field label={copy.categoryName} htmlFor="category-name" error={error}>
            <Input
              id="category-name"
              name="name"
              defaultValue={category?.name}
              placeholder={copy.categoryNamePlaceholder}
              maxLength={30}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium">
              {copy.categoryIcon}
            </legend>
            <input type="hidden" name="icon" value={icon} />
            <div className="grid grid-cols-8 gap-1.5">
              {CATEGORY_ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={icon === name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "rounded-control flex aspect-square items-center justify-center border transition-colors",
                    icon === name
                      ? "border-brass bg-brass/10 text-ink"
                      : "border-line text-ink-muted hover:bg-surface-muted",
                  )}
                >
                  <CategoryIcon name={name} />
                </button>
              ))}
            </div>
          </fieldset>

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
