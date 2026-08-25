"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { getMessages } from "@/server/i18n";
import { validateManifest } from "@/server/extensions/runtime";
import {
  deleteSource,
  extensionsEnabled,
  forget,
  listFiles,
  setEnabled,
  writeSource,
} from "@/server/extensions/store";

export interface ActionResult {
  error?: string;
}

/** Generous for source code, small enough that nobody uploads a video by accident. */
const MAX_SOURCE_BYTES = 512 * 1024;

/**
 * Install an extension from an uploaded file.
 *
 * The manifest is read before anything is written, by importing the module from a
 * temporary location — which means the code runs during installation. That is inherent to
 * a server-side plugin and not something this check could avoid: by the time you are
 * choosing to install an extension, you have chosen to run it. The form says so.
 */
export async function installExtension(formData: FormData): Promise<ActionResult> {
  await requireSession();
  const t = getMessages();

  if (!extensionsEnabled()) {
    return { error: t.extensions.switchedOff };
  }

  const file = formData.get("file");
  const confirmed = formData.get("confirmed") === "true";
  if (!(file instanceof File) || file.size === 0) {
    return { error: t.extensions.missingFile };
  }
  if (!confirmed) {
    return { error: t.extensions.notConfirmed };
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return { error: t.extensions.tooLarge };
  }

  const source = await file.text();

  // The manifest is parsed out of the source rather than by importing it, so a file that
  // is not an extension is refused before any of it is executed.
  const manifest = readManifestFromSource(source);
  if (!manifest) {
    return { error: t.extensions.invalid };
  }
  let validated;
  try {
    validated = validateManifest(manifest);
  } catch (error) {
    return { error: error instanceof Error ? error.message : t.extensions.invalid };
  }

  if (listFiles().includes(`${validated.id}.mjs`)) {
    return { error: t.extensions.duplicate };
  }

  writeSource(validated.id, source);
  setEnabled(validated.id, true);
  refresh();
  return {};
}

/**
 * Pull the manifest out of the source without running it.
 *
 * A regular expression over source is a blunt instrument, and deliberately so: it is
 * enough to tell an extension from a photograph, and it does that without executing a
 * line. Everything past this point is the household's decision.
 */
function readManifestFromSource(source: string): unknown {
  const match = /export\s+const\s+manifest\s*=\s*(\{[\s\S]*?\})\s*;/.exec(source);
  if (!match?.[1]) {
    return null;
  }
  try {
    // A manifest is data: object literal syntax with string and number values only.
    return JSON.parse(
      match[1]
        .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,(\s*})/g, "$1"),
    );
  } catch {
    return null;
  }
}

export async function toggleExtension(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  await requireSession();
  setEnabled(id, enabled);
  refresh();
  return {};
}

export async function removeExtension(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    deleteSource(id);
    forget(id);
  } catch {
    return { error: getMessages().validation.failed };
  }
  refresh();
  return {};
}
