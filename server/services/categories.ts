import { asc, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

/**
 * Categories are what fixed costs are sorted by.
 *
 * The seeded ones can be renamed but not removed: they are what the expense form offers
 * by default, and a household that empties the list would be left with a form it cannot
 * fill in.
 */

export interface CategoryRow {
  id: number;
  name: string;
  icon: string;
  isSystem: boolean;
}

export function listCategories(db: Db = getDb()): CategoryRow[] {
  return db
    .select({
      id: schema.category.id,
      name: schema.category.name,
      icon: schema.category.icon,
      isSystem: schema.category.isSystem,
    })
    .from(schema.category)
    .orderBy(asc(schema.category.sortOrder), asc(schema.category.id))
    .all();
}

export function createCategory(
  input: { name: string; icon: string },
  db: Db = getDb(),
): number {
  const highest =
    db
      .select({ value: max(schema.category.sortOrder) })
      .from(schema.category)
      .get()?.value ?? 0;

  return db
    .insert(schema.category)
    .values({ ...input, sortOrder: highest + 1, isSystem: false })
    .returning({ id: schema.category.id })
    .get().id;
}

export function updateCategory(
  id: number,
  input: { name: string; icon: string },
  db: Db = getDb(),
): void {
  db.update(schema.category)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.category.id, id))
    .run();
}

/**
 * Remove a category the household added. Expenses that used it keep everything except
 * the label — the schema sets their `category_id` to null rather than cascading.
 *
 * Returns false when the category is a seeded one, which must not be removed.
 */
export function deleteCategory(id: number, db: Db = getDb()): boolean {
  const existing = db
    .select({ isSystem: schema.category.isSystem })
    .from(schema.category)
    .where(eq(schema.category.id, id))
    .get();

  if (!existing || existing.isSystem) {
    return false;
  }

  db.delete(schema.category).where(eq(schema.category.id, id)).run();
  return true;
}

/** True when the name is already taken, which the unique index would reject anyway. */
export function categoryNameTaken(
  name: string,
  exceptId: number | undefined,
  db: Db = getDb(),
): boolean {
  const existing = db
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(eq(schema.category.name, name))
    .get();

  return existing !== undefined && existing.id !== exceptId;
}
