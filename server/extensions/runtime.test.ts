import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import { loadExtensions, renderCards, validateManifest } from "./runtime";
import { setEnabled } from "./store";

let dir: string;
let dataDir: string;
let handle: ReturnType<typeof createDb>;
const originalEnv = { ...process.env };

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "kk-ext-db-"));
  dir = mkdtempSync(join(tmpdir(), "kk-ext-"));
  handle = createDb(join(dataDir, "test.db"));
  process.env.EXTENSIONS_DIR = dir;
  delete process.env.EXTENSIONS_ENABLED;
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
  rmSync(dataDir, { recursive: true, force: true });
  process.env = { ...originalEnv };
});

function write(id: string, body: string) {
  writeFileSync(join(dir, `${id}.mjs`), body, "utf8");
}

const working = (id: string) => `
export const manifest = {
  id: "${id}",
  name: "Test ${id}",
  version: "1.0.0",
  apiVersion: 1,
};
export function register(api) {
  api.registerDashboardCard({
    id: "card",
    title: "Card",
    render: () => ({ rows: [{ label: "Answer", value: "42" }] }),
  });
}
`;

describe("validateManifest", () => {
  const base = { id: "ok-one", name: "One", version: "1.0.0", apiVersion: 1 };

  it("accepts a complete manifest", () => {
    expect(validateManifest(base).id).toBe("ok-one");
  });

  it("refuses an id that could escape the extensions folder", () => {
    expect(() => validateManifest({ ...base, id: "../../etc/passwd" })).toThrow(/id/);
    expect(() => validateManifest({ ...base, id: "Has Spaces" })).toThrow(/id/);
  });

  it("refuses a contract version it does not implement", () => {
    expect(() => validateManifest({ ...base, apiVersion: 99 })).toThrow(/apiVersion/);
  });

  it("refuses anything that is not a manifest at all", () => {
    expect(() => validateManifest(null)).toThrow();
    expect(() => validateManifest("nope")).toThrow();
  });
});

describe("loadExtensions", () => {
  it("finds an extension but contributes nothing until it is enabled", async () => {
    write("alpha", working("alpha"));

    const off = await loadExtensions(handle.db);
    expect(off.installed).toHaveLength(1);
    expect(off.installed[0]?.enabled).toBe(false);
    expect(off.cards).toHaveLength(0);

    setEnabled("alpha", true, handle.db);
    const on = await loadExtensions(handle.db);
    expect(on.installed[0]?.enabled).toBe(true);
    expect(on.cards).toHaveLength(1);
  });

  /**
   * The one guarantee worth making about code that otherwise runs with no restrictions:
   * one person's broken experiment cannot take the household's finances offline.
   */
  it("isolates an extension that throws while registering", async () => {
    write("good", working("good"));
    write(
      "bad",
      `
export const manifest = { id: "bad", name: "Bad", version: "1.0.0", apiVersion: 1 };
export function register() {
  throw new Error("boom");
}
`,
    );
    setEnabled("good", true, handle.db);
    setEnabled("bad", true, handle.db);

    const loaded = await loadExtensions(handle.db);
    const bad = loaded.installed.find((entry) => entry.manifest.id === "bad");
    expect(bad?.error).toContain("boom");
    expect(loaded.cards).toHaveLength(1);
    expect(loaded.cards[0]?.extensionId).toBe("good");
  });

  it("records a file that is not an extension instead of failing", async () => {
    write("junk", "this is not javascript at all {{{");
    const loaded = await loadExtensions(handle.db);
    expect(loaded.installed).toHaveLength(1);
    expect(loaded.installed[0]?.error).toBeTruthy();
    expect(loaded.cards).toHaveLength(0);
  });

  it("loads nothing at all when the instance has them switched off", async () => {
    write("alpha", working("alpha"));
    setEnabled("alpha", true, handle.db);
    process.env.EXTENSIONS_ENABLED = "false";

    const loaded = await loadExtensions(handle.db);
    expect(loaded.installed).toHaveLength(0);
    expect(loaded.cards).toHaveLength(0);
  });
});

describe("renderCards", () => {
  it("drops a card that throws rather than failing the dashboard", async () => {
    write("good", working("good"));
    write(
      "thrower",
      `
export const manifest = { id: "thrower", name: "T", version: "1.0.0", apiVersion: 1 };
export function register(api) {
  api.registerDashboardCard({
    id: "boom",
    title: "Boom",
    render() { throw new Error("card exploded"); },
  });
}
`,
    );
    setEnabled("good", true, handle.db);
    setEnabled("thrower", true, handle.db);

    const loaded = await loadExtensions(handle.db);
    const context = {
      period: "2026-08",
      summary: {} as never,
      db: handle.db,
    };
    const rendered = renderCards(loaded, context);
    expect(rendered).toHaveLength(1);
    expect(rendered[0]?.title).toBe("Card");
  });

  it("leaves out a card that decides it has nothing to say", async () => {
    write(
      "quiet",
      `
export const manifest = { id: "quiet", name: "Q", version: "1.0.0", apiVersion: 1 };
export function register(api) {
  api.registerDashboardCard({ id: "none", title: "None", render: () => null });
}
`,
    );
    setEnabled("quiet", true, handle.db);
    const loaded = await loadExtensions(handle.db);
    expect(
      renderCards(loaded, { period: "2026-08", summary: {} as never, db: handle.db }),
    ).toHaveLength(0);
  });
});
