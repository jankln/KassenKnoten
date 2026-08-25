import { statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import * as money from "@/lib/domain/money";
import * as split from "@/lib/domain/split";
import * as period from "@/lib/domain/period";
import * as interval from "@/lib/domain/interval";
import * as format from "@/lib/format";
import * as dashboard from "@/server/services/dashboard";
import * as expenses from "@/server/services/expenses";
import * as variableCosts from "@/server/services/variable-costs";
import * as savings from "@/server/services/savings";
import * as members from "@/server/services/members";
import {
  EXTENSION_API_VERSION,
  type DashboardCard,
  type ExtensionApi,
  type ExtensionManifest,
  type ExtensionModule,
  type InstalledExtension,
} from "./types";
import {
  extensionsDir,
  extensionsEnabled,
  ID_PATTERN,
  listFiles,
  readEnabled,
} from "./store";

/**
 * Loading extensions.
 *
 * Every failure mode ends the same way: the extension contributes nothing, the reason is
 * recorded, and the app carries on. One person's experiment must not be able to take a
 * household's finances offline — which is the one guarantee worth making about code that
 * otherwise runs with no restrictions at all.
 */

export interface LoadedExtensions {
  installed: InstalledExtension[];
  cards: (DashboardCard & { extensionId: string })[];
}

export function validateManifest(value: unknown): ExtensionManifest {
  if (!value || typeof value !== "object") {
    throw new Error("The module does not export a manifest object.");
  }
  const m = value as Record<string, unknown>;
  if (typeof m.id !== "string" || !ID_PATTERN.test(m.id)) {
    throw new Error(
      "manifest.id has to be lowercase letters, digits and hyphens (2–50 characters).",
    );
  }
  if (typeof m.name !== "string" || m.name.trim() === "") {
    throw new Error("manifest.name is required.");
  }
  if (typeof m.version !== "string" || m.version.trim() === "") {
    throw new Error("manifest.version is required.");
  }
  if (m.apiVersion !== EXTENSION_API_VERSION) {
    throw new Error(
      `manifest.apiVersion has to be ${EXTENSION_API_VERSION}, not ${String(m.apiVersion)}.`,
    );
  }
  return {
    id: m.id,
    name: m.name.trim(),
    version: m.version.trim(),
    apiVersion: EXTENSION_API_VERSION,
    ...(typeof m.description === "string" ? { description: m.description } : {}),
    ...(typeof m.author === "string" ? { author: m.author } : {}),
  };
}

function apiFor(
  manifest: ExtensionManifest,
  db: Db,
  collect: (card: DashboardCard) => void,
): ExtensionApi {
  return {
    apiVersion: EXTENSION_API_VERSION,
    manifest,
    db,
    schema,
    services: { dashboard, expenses, variableCosts, savings, members },
    domain: { money, split, period, interval },
    format,
    log: (...values) => console.log(`[extension:${manifest.id}]`, ...values),
    registerDashboardCard: (card) => collect(card),
  };
}

/**
 * Read, import and register every extension in the directory.
 *
 * The import URL carries the file's modification time. Node caches an ES module for the
 * life of the process, so without it a re-uploaded extension would keep running its old
 * code until the container restarted — and "why is my change not showing" is the worst
 * possible first experience of a plugin system.
 */
export async function loadExtensions(db: Db = getDb()): Promise<LoadedExtensions> {
  if (!extensionsEnabled()) {
    return { installed: [], cards: [] };
  }

  const enabledMap = readEnabled(db);
  const installed: InstalledExtension[] = [];
  const cards: (DashboardCard & { extensionId: string })[] = [];

  for (const fileName of listFiles()) {
    const path = join(extensionsDir(), fileName);
    let manifest: ExtensionManifest | undefined;
    try {
      const stamp = statSync(path).mtimeMs;
      const loaded = (await import(
        /* webpackIgnore: true */ `${pathToFileURL(path).href}?v=${stamp}`
      )) as Partial<ExtensionModule>;

      manifest = validateManifest(loaded.manifest);
      if (typeof loaded.register !== "function") {
        throw new Error("The module does not export a register function.");
      }

      const enabled = enabledMap[manifest.id] ?? false;
      if (!enabled) {
        installed.push({ manifest, enabled, fileName });
        continue;
      }

      // Registered into a local list first: an extension that throws half way through
      // must not leave the cards it managed to add behind, and the entry is recorded once
      // either way rather than once here and again in the catch.
      const own: DashboardCard[] = [];
      await loaded.register(apiFor(manifest, db, (card) => own.push(card)));
      installed.push({ manifest, enabled, fileName });
      for (const card of own) {
        cards.push({ ...card, extensionId: manifest.id });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[extension:${fileName}] failed to load.`, error);
      installed.push({
        manifest: manifest ?? {
          id: fileName.replace(/\.mjs$/, ""),
          name: fileName,
          version: "—",
          apiVersion: EXTENSION_API_VERSION,
        },
        enabled: manifest ? (enabledMap[manifest.id] ?? false) : false,
        error: message,
        fileName,
      });
    }
  }

  return { installed, cards };
}

/**
 * Render the cards of every enabled extension.
 *
 * A card that throws is dropped rather than allowed to fail the dashboard: the rest of
 * the month's figures are still correct and still worth showing.
 */
export function renderCards(
  loaded: LoadedExtensions,
  context: Parameters<DashboardCard["render"]>[0],
) {
  return loaded.cards.flatMap((card) => {
    try {
      const content = card.render(context);
      return content ? [{ id: card.id, title: card.title, content }] : [];
    } catch (error) {
      console.error(`[extension:${card.extensionId}] card "${card.id}" threw.`, error);
      return [];
    }
  });
}
