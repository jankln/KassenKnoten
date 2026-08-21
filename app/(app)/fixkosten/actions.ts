"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import { privateExpenseInput } from "@/lib/validation/expense";
import {
  createPrivateExpense,
  restoreExpense,
  retireExpense,
  updatePrivateExpense,
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
