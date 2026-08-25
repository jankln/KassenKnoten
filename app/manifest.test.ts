import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

/**
 * Installability is decided by the browser against a checklist, silently: get one item
 * wrong and the install option simply never appears, with nothing in the console to say
 * why. These are that checklist.
 */
describe("web app manifest", () => {
  const value = manifest();

  it("declares the fields a browser requires before it offers to install", () => {
    expect(value.name).toBeTruthy();
    expect(value.short_name).toBeTruthy();
    expect(value.start_url).toBe("/");
    expect(value.display).toBe("standalone");
  });

  it("offers both icon sizes Chromium insists on, and a maskable variant", () => {
    const sizes = (purpose: string) =>
      (value.icons ?? [])
        .filter((icon) => icon.purpose === purpose)
        .map((icon) => icon.sizes);

    expect(sizes("any")).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(sizes("maskable")).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  it("points every icon at a file that exists", () => {
    for (const icon of value.icons ?? []) {
      expect(existsSync(new URL(`../public${icon.src}`, import.meta.url))).toBe(true);
    }
  });

  it("keeps every route it names inside its own scope", () => {
    for (const shortcut of value.shortcuts ?? []) {
      expect(shortcut.url.startsWith("/")).toBe(true);
    }
  });
});
