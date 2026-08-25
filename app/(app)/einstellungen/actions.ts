"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { categoryInput } from "@/lib/validation/category";
import { defaultSplitInput } from "@/lib/validation/expense";
import {
  categoryNameTaken,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/server/services/categories";
import { setDefaultSplit } from "@/server/services/household";
import { getMessages } from "@/server/i18n";
import { setLocale } from "@/server/i18n";
import { isLocale, type Locale } from "@/lib/i18n";

export interface ActionResult {
  error?: string;
}

function parse(formData: FormData) {
  return categoryInput(getMessages()).safeParse({
    name: formData.get("name"),
    icon: formData.get("icon"),
  });
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const t = getMessages();
  await requireSession();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.validation.failed };
  }
  if (categoryNameTaken(parsed.data.name, undefined)) {
    return { error: t.validation.nameTaken };
  }

  createCategory(parsed.data);
  refresh();
  return {};
}

export async function editCategory(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const t = getMessages();
  await requireSession();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.validation.failed };
  }
  if (categoryNameTaken(parsed.data.name, id)) {
    return { error: t.validation.nameTaken };
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
  const t = getMessages();
  await requireSession();

  if (!deleteCategory(id)) {
    return { error: t.validation.failed };
  }
  refresh();
  return {};
}

/**
 * The default split pre-fills the form for new shared costs. It deliberately does not
 * touch existing expenses: those carry the split the household decided for them.
 */
export async function saveDefaultSplit(formData: FormData): Promise<ActionResult> {
  const t = getMessages();
  await requireSession();

  const shares: { memberId: number; shareBp: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const match = /^share-(\d+)$/.exec(key);
    if (match?.[1]) {
      shares.push({ memberId: Number(match[1]), shareBp: Number(value) });
    }
  }

  const parsed = defaultSplitInput(getMessages()).safeParse({
    splitMode: formData.get("splitMode"),
    shares,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.validation.failed };
  }

  setDefaultSplit(parsed.data);
  refresh();
  return {};
}

/**
 * Change the interface language for the whole household.
 *
 * Stored on the household rather than in a cookie: a household that reads German reads
 * German on the tablet in the kitchen too, and the login screen — which nobody has
 * authenticated to yet — still needs to know which language to greet them in.
 */
export async function changeLanguage(locale: Locale): Promise<ActionResult> {
  await requireSession();
  if (!isLocale(locale)) {
    return { error: getMessages().validation.failed };
  }
  setLocale(locale);
  refresh();
  return {};
}
