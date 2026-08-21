"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import { savingsPotInput } from "@/lib/validation/savings";
import {
  createSavingsPot,
  restoreSavingsPot,
  retireSavingsPot,
  updateSavingsPot,
} from "@/server/services/savings";

export interface ActionResult {
  error?: string;
}

function parse(formData: FormData) {
  return savingsPotInput.safeParse({
    name: formData.get("name"),
    monthlyRateCents: formData.get("monthlyRateCents"),
    balanceCents: formData.get("balanceCents"),
    targetCents: formData.get("targetCents"),
    ownerMemberId: formData.get("ownerMemberId"),
    note: formData.get("note"),
  });
}

export async function addSavingsPot(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  createSavingsPot(parsed.data);
  refresh();
  return {};
}

export async function editSavingsPot(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }

  updateSavingsPot(id, parsed.data);
  refresh();
  return {};
}

export async function removeSavingsPot(id: number): Promise<ActionResult> {
  await requireSession();
  retireSavingsPot(id);
  refresh();
  return {};
}

export async function restoreSavingsPotAction(id: number): Promise<ActionResult> {
  await requireSession();
  restoreSavingsPot(id);
  refresh();
  return {};
}
