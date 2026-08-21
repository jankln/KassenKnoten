import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import { SYSTEM_CATEGORIES } from "@/db/seed";
import {
  categoryNameTaken,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./categories";

let dir: string;
let handle: ReturnType<typeof createDb>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "kk-categories-"));
  handle = createDb(join(dir, "test.db"));
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

function db() {
  return handle.db;
}

describe("categories", () => {
  it("starts with the seeded set, all marked as system", () => {
    const rows = listCategories(db());
    expect(rows).toHaveLength(SYSTEM_CATEGORIES.length);
    expect(rows.every((row) => row.isSystem)).toBe(true);
  });

  it("adds a custom category after the seeded ones", () => {
    createCategory({ name: "Haustier", icon: "cat" }, db());
    const rows = listCategories(db());
    expect(rows.at(-1)).toMatchObject({ name: "Haustier", isSystem: false });
  });

  it("renames a seeded category without making it removable", () => {
    const [first] = listCategories(db());
    updateCategory(first!.id, { name: "Zuhause", icon: first!.icon }, db());

    expect(listCategories(db())[0]?.name).toBe("Zuhause");
    expect(deleteCategory(first!.id, db())).toBe(false);
    expect(listCategories(db())).toHaveLength(SYSTEM_CATEGORIES.length);
  });

  it("removes a custom category", () => {
    const id = createCategory({ name: "Haustier", icon: "cat" }, db());
    expect(deleteCategory(id, db())).toBe(true);
    expect(listCategories(db())).toHaveLength(SYSTEM_CATEGORIES.length);
  });

  it("leaves an expense intact when its category goes, only uncategorised", () => {
    const categoryId = createCategory({ name: "Haustier", icon: "cat" }, db());
    const memberId = db()
      .insert(schema.member)
      .values({ name: "Alex" })
      .returning({ id: schema.member.id })
      .get().id;
    db()
      .insert(schema.expense)
      .values({
        scope: "private",
        memberId,
        categoryId,
        label: "Futter",
        amountCents: 3500,
      })
      .run();

    deleteCategory(categoryId, db());

    const expenses = db().select().from(schema.expense).all();
    expect(expenses).toHaveLength(1);
    expect(expenses[0]?.categoryId).toBeNull();
  });

  it("reports a name that is already taken, ignoring the row being edited", () => {
    const id = createCategory({ name: "Haustier", icon: "cat" }, db());
    expect(categoryNameTaken("Haustier", undefined, db())).toBe(true);
    expect(categoryNameTaken("Haustier", id, db())).toBe(false);
    expect(categoryNameTaken("Wohnen", undefined, db())).toBe(true);
    expect(categoryNameTaken("Neu", undefined, db())).toBe(false);
  });
});
