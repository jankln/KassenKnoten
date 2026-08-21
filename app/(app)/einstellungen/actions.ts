"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import { categoryInput } from "@/lib/validation/category";
import { defaultSplitInput } from "@/lib/validation/expense";
import {
  categoryNameTaken,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/server/services/categories";
import { setDefaultSplit } from "@/server/services/household";

export interface ActionResult {
  error?: string;
}

function parse(formData: FormData) {
  return categoryInput.safeParse({
    name: formData.get("name"),
    icon: formData.get("icon"),
  });
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  if (categoryNameTaken(parsed.data.name, undefined)) {
    return { error: de.validation.nameTaken };
  }

  createCategory(parsed.data);
  refresh();
  return {};
}

export async function editCategory(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  if (categoryNameTaken(parsed.data.name, id)) {
    return { error: de.validation.nameTaken };
  }

  updateCategory(id, parsed.data);
  refresh();
  return {};
}

/**
 * Removing a category is a real delete, so there is nothing to restore — which is why
 * the button asks for a category the household added, and never a seeded one.
 */
export async function removeCategory(id: number): Promise<ActionResult> {
  await requireSession();

  if (!deleteCategory(id)) {
    return { error: de.validation.failed };
  }
  refresh();
  return {};
}

/**
 * The default split pre-fills the form for new shared costs. It deliberately does not
 * touch existing expenses: those carry the split the household decided for them.
 */
export async function saveDefaultSplit(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const shares: { memberId: number; shareBp: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const match = /^share-(\d+)$/.exec(key);
    if (match?.[1]) {
      shares.push({ memberId: Number(match[1]), shareBp: Number(value) });
    }
  }

  const parsed = defaultSplitInput.safeParse({
    splitMode: formData.get("splitMode"),
    shares,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  setDefaultSplit(parsed.data);
  refresh();
  return {};
}
