"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import { incomeInput, memberInput } from "@/lib/validation/member";
import {
  createIncome,
  createMember,
  memberExists,
  removeIncome,
  restoreIncome,
  restoreMember,
  retireMember,
  updateIncome,
  updateMember,
} from "@/server/services/members";

/**
 * Mutations for the household screen.
 *
 * Every one of them re-checks the session. The proxy already refuses unauthenticated
 * requests, but a server action is a public endpoint: one wrong matcher must never be
 * enough to let someone write to the household.
 */

export interface ActionResult {
  error?: string;
}

function fail(message?: string): ActionResult {
  return { error: message ?? de.validation.failed };
}

export async function addMember(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const parsed = memberInput.safeParse({
    name: formData.get("name"),
    colorIndex: formData.get("colorIndex"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message);
  }

  createMember(parsed.data);
  refresh();
  return {};
}

export async function editMember(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();

  const parsed = memberInput.safeParse({
    name: formData.get("name"),
    colorIndex: formData.get("colorIndex"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message);
  }
  if (!memberExists(id)) {
    return fail();
  }

  updateMember(id, parsed.data);
  refresh();
  return {};
}

export async function retireMemberAction(id: number): Promise<ActionResult> {
  await requireSession();
  retireMember(id);
  refresh();
  return {};
}

export async function restoreMemberAction(id: number): Promise<ActionResult> {
  await requireSession();
  restoreMember(id);
  refresh();
  return {};
}

export async function addIncome(
  memberId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();

  const parsed = incomeInput.safeParse({
    memberId,
    label: formData.get("label"),
    kind: formData.get("kind"),
    amountCents: formData.get("amountCents"),
    intervalMonths: formData.get("intervalMonths"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil") ?? "",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message);
  }
  if (!memberExists(memberId)) {
    return fail();
  }

  createIncome(parsed.data);
  refresh();
  return {};
}

export async function editIncome(
  id: number,
  memberId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();

  const parsed = incomeInput.safeParse({
    memberId,
    label: formData.get("label"),
    kind: formData.get("kind"),
    amountCents: formData.get("amountCents"),
    intervalMonths: formData.get("intervalMonths"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil") ?? "",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message);
  }

  updateIncome(id, parsed.data);
  refresh();
  return {};
}

export async function removeIncomeAction(id: number): Promise<ActionResult> {
  await requireSession();
  removeIncome(id);
  refresh();
  return {};
}

export async function restoreIncomeAction(id: number): Promise<ActionResult> {
  await requireSession();
  restoreIncome(id);
  refresh();
  return {};
}
