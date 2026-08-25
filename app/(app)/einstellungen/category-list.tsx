"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { CategoryRow } from "@/server/services/categories";
import { removeCategory } from "./actions";
import { CategoryDialog } from "./category-dialog";
import { useMessages } from "@/components/providers/messages-provider";

export function CategoryList({ categories }: { categories: CategoryRow[] }) {
  const t = useMessages();
  const [, startTransition] = useTransition();
  const copy = t.sections.settings;

  function remove(category: CategoryRow) {
    startTransition(async () => {
      const result = await removeCategory(category.id);
      toast(result.error ?? copy.categoryRemoved(category.name));
    });
  }

  return (
    <>
      <ul className="border-line divide-line rounded-card divide-y border">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
            <span className="text-ink-muted">
              <CategoryIcon name={category.icon} />
            </span>
            <span className="truncate text-sm font-medium">{category.name}</span>

            <div className="ml-auto flex shrink-0 items-center">
              <CategoryDialog
                category={category}
                trigger={
                  <Button variant="ghost" size="icon" aria-label={copy.editCategory}>
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                }
              />
              {/* Seeded categories stay: they are what the expense form offers by
                  default, and an empty list would leave that form unfillable. */}
              {category.isSystem ? (
                <span className="size-10" aria-hidden />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.removeCategory}
                  onClick={() => remove(category)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-ink-muted text-xs">{copy.systemCategoryHint}</p>
        <CategoryDialog
          trigger={
            <Button variant="secondary" size="sm" className="shrink-0">
              <Plus className="size-4" aria-hidden />
              {copy.addCategory}
            </Button>
          }
        />
      </div>
    </>
  );
}
