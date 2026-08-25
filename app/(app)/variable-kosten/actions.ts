"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { de } from "@/lib/i18n/de";
import {
  bookingInput,
  privateVariableCostInput,
  sharedVariableCostInput,
} from "@/lib/validation/variable";
import {
  createBooking,
  createVariableCost,
  restoreBooking,
  restoreVariableCost,
  retireBooking,
  retireVariableCost,
  updateBooking,
  updateVariableCost,
} from "@/server/services/variable-costs";

export interface ActionResult {
  error?: string;
}

const common = (formData: FormData) => ({
  label: formData.get("label"),
  mode: formData.get("mode"),
  plannedCents: formData.get("plannedCents"),
  categoryId: formData.get("categoryId"),
  validFrom: formData.get("validFrom"),
  validUntil: formData.get("validUntil") ?? "",
});

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

function parsePrivate(formData: FormData) {
  return privateVariableCostInput.safeParse({
    ...common(formData),
    memberId: formData.get("memberId"),
  });
}

function parseShared(formData: FormData) {
  return sharedVariableCostInput.safeParse({
    ...common(formData),
    splitMode: formData.get("splitMode"),
    shares: readShares(formData),
  });
}

export async function addPrivateVariableCost(
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const parsed = parsePrivate(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  createVariableCost({ ...parsed.data, scope: "private" });
  refresh();
  return {};
}

export async function editPrivateVariableCost(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const parsed = parsePrivate(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  updateVariableCost(id, { ...parsed.data, scope: "private" });
  refresh();
  return {};
}

export async function addSharedVariableCost(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseShared(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  createVariableCost({ ...parsed.data, scope: "shared" });
  refresh();
  return {};
}

export async function editSharedVariableCost(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const parsed = parseShared(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  updateVariableCost(id, { ...parsed.data, scope: "shared" });
  refresh();
  return {};
}

export async function removeVariableCost(id: number): Promise<ActionResult> {
  await requireSession();
  retireVariableCost(id);
  refresh();
  return {};
}

export async function restoreVariableCostAction(id: number): Promise<ActionResult> {
  await requireSession();
  restoreVariableCost(id);
  refresh();
  return {};
}

/* ------------------------------------------------------------------------- *
 * Bookings
 * ------------------------------------------------------------------------- */

function parseBooking(formData: FormData) {
  return bookingInput.safeParse({
    variableCostId: formData.get("variableCostId"),
    bookedOn: formData.get("bookedOn"),
    label: formData.get("label") ?? "",
    amountCents: formData.get("amountCents"),
  });
}

export async function addBooking(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = parseBooking(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  createBooking(parsed.data);
  refresh();
  return {};
}

export async function editBooking(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
  const parsed = parseBooking(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? de.validation.failed };
  }
  updateBooking(id, parsed.data);
  refresh();
  return {};
}

export async function removeBooking(id: number): Promise<ActionResult> {
  await requireSession();
  retireBooking(id);
  refresh();
  return {};
}

export async function restoreBookingAction(id: number): Promise<ActionResult> {
  await requireSession();
  restoreBooking(id);
  refresh();
  return {};
}
