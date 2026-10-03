import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, items } from "@/db/schema";
import { DataError, isUniqueViolation } from "./errors";

// Every function takes the shop id explicitly; callers get it from the session.

export function listCategories(shopId: string) {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.shopId, shopId), isNull(categories.deletedAt)))
    .orderBy(asc(categories.name));
}

export function listCategoriesWithCounts(shopId: string) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      itemCount: sql<number>`count(${items.id})::int`,
    })
    .from(categories)
    .leftJoin(items, and(eq(items.categoryId, categories.id), isNull(items.deletedAt)))
    .where(and(eq(categories.shopId, shopId), isNull(categories.deletedAt)))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

const DUPLICATE = "You already have a category with this name";

export async function createCategory(shopId: string, name: string) {
  try {
    const [row] = await db.insert(categories).values({ shopId, name }).returning();
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new DataError("name", DUPLICATE);
    throw e;
  }
}

export async function renameCategory(shopId: string, id: string, name: string) {
  try {
    const [row] = await db
      .update(categories)
      .set({ name })
      .where(
        and(eq(categories.id, id), eq(categories.shopId, shopId), isNull(categories.deletedAt)),
      )
      .returning();
    if (!row) throw new DataError(null, "Category not found");
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new DataError("name", DUPLICATE);
    throw e;
  }
}

/** Soft delete. Blocked while live items use the category. */
export async function deleteCategory(shopId: string, id: string) {
  await db.transaction(async (tx) => {
    const [cat] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, id), eq(categories.shopId, shopId), isNull(categories.deletedAt)),
      )
      .for("update");
    if (!cat) throw new DataError(null, "Category not found");

    const [{ n }] = await tx
      .select({ n: count() })
      .from(items)
      .where(and(eq(items.categoryId, id), eq(items.shopId, shopId), isNull(items.deletedAt)));
    if (n > 0)
      throw new DataError(
        null,
        `Move or delete its ${n} item${n === 1 ? "" : "s"} before deleting this category`,
      );

    await tx.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, id));
  });
}
