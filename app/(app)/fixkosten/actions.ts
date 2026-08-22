"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import { privateExpenseInput, sharedExpenseInput } from "@/lib/validation/expense";
import {
  createPrivateExpense,
  createSharedExpense,
  restoreExpense,
  retireExpense,
  updatePrivateExpense,
  updateSharedExpense,
} from "@/server/services/expenses";

export interface ActionResult {
  error?: string;
}

function parse(formData: FormData) {
  return privateExpenseInput.safeParse({
    memberId: formData.get("memberId"),
    label: formData.get("label"),
    amountCents: formData.get("amountCents"),
    intervalMonths: formData.get("intervalMonths"),
    categoryId: formData.get("categoryId"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil") ?? "",
  });
}

export async function addPrivateExpense(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  createPrivateExpense(parsed.data);
  refresh();
  return {};
}

export async function editPrivateExpense(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  updatePrivateExpense(id, parsed.data);
  refresh();
  return {};
}

export async function removeExpense(id: number): Promise<ActionResult> {
  await requireSession();
  retireExpense(id);
  refresh();
  return {};
}

export async function restoreExpenseAction(id: number): Promise<ActionResult> {
  await requireSession();
  restoreExpense(id);
  refresh();
  return {};
}

/* ------------------------------------------------------------------------- *
 * Shared expenses
 * ------------------------------------------------------------------------- */

/**
 * Read the per-member quota out of the form. Each member has their own field, so the
 * shape survives a person being added or removed while the form is open.
 */
function readShares(formData: FormData): { memberId: number; shareBp: number }[] {
  const shares: { memberId: number; shareBp: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const match = /^share-(\d+)$/.exec(key);
    if (match?.[1]) {
      shares.push({ memberId: Number(match[1]), shareBp: Number(value) });
    }
  }
  return shares;
}

function parseShared(formData: FormData) {
  return sharedExpenseInput.safeParse({
    label: formData.get("label"),
    amountCents: formData.get("amountCents"),
    intervalMonths: formData.get("intervalMonths"),
    categoryId: formData.get("categoryId"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil") ?? "",
    splitMode: formData.get("splitMode"),
    shares: readShares(formData),
  });
}

export async function addSharedExpense(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const parsed = parseShared(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  createSharedExpense(parsed.data);
  refresh();
  return {};
}

export async function editSharedExpense(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();

  const parsed = parseShared(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  updateSharedExpense(id, parsed.data);
  refresh();
  return {};
}
