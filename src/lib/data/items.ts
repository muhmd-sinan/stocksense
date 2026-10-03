import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { categories, items, transactions } from "@/db/schema";
import { round3, toNum } from "@/lib/format";
import type { ItemOption } from "@/lib/parser/draft";
import { uuidSchema, type ItemInput } from "@/lib/validation";
import { DataError, isUniqueViolation } from "./errors";

// Every function takes the shop id explicitly; callers get it from the session.

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export function listItems(shopId: string, filter: { q?: string; categoryId?: string } = {}) {
  const conds = [eq(items.shopId, shopId), isNull(items.deletedAt)];
  const q = filter.q?.trim();
  if (q) conds.push(ilike(items.name, `%${escapeLike(q)}%`));
  if (filter.categoryId && uuidSchema.safeParse(filter.categoryId).success)
    conds.push(eq(items.categoryId, filter.categoryId));

  return db
    .select({
      id: items.id,
      name: items.name,
      unit: items.unit,
      price: items.price,
      currentStock: items.currentStock,
      lowStockThreshold: items.lowStockThreshold,
      createdAt: items.createdAt,
      categoryId: items.categoryId,
      categoryName: categories.name,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .where(and(...conds))
    .orderBy(asc(items.name));
}
export type ItemRow = Awaited<ReturnType<typeof listItems>>[number];

/** Live items as plain numbers, for the entry card */
export async function listItemOptions(shopId: string): Promise<ItemOption[]> {
  const rows = await listItems(shopId);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    price: toNum(r.price),
    stock: toNum(r.currentStock),
    threshold: toNum(r.lowStockThreshold),
  }));
}

export async function getItem(shopId: string, id: string) {
  if (!uuidSchema.safeParse(id).success) return null;
  const row = await db.query.items.findFirst({
    where: and(eq(items.id, id), eq(items.shopId, shopId), isNull(items.deletedAt)),
  });
  return row ?? null;
}

export async function assertCategory(tx: Tx, shopId: string, categoryId: string) {
  const cat = await tx.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.shopId, shopId),
      isNull(categories.deletedAt),
    ),
  });
  if (!cat) throw new DataError("categoryId", "Pick a category");
}

const DUPLICATE = "You already have an item with this name";

/** Creates an item. Opening stock is recorded as a restock so stock always matches the ledger. */
export async function createItem(shopId: string, input: ItemInput) {
  try {
    return await db.transaction(async (tx) => {
      await assertCategory(tx, shopId, input.categoryId);
      const [item] = await tx
        .insert(items)
        .values({
          shopId,
          categoryId: input.categoryId,
          name: input.name,
          unit: input.unit,
          price: String(input.price),
          currentStock: String(round3(input.currentStock)),
          lowStockThreshold: String(round3(input.lowStockThreshold)),
        })
        .returning();
      if (input.currentStock > 0) {
        await tx.insert(transactions).values({
          shopId,
          itemId: item.id,
          type: "restock",
          quantity: String(round3(input.currentStock)),
          rawText: "Opening stock",
        });
      }
      return item;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DataError("name", DUPLICATE);
    throw e;
  }
}

/** Updates an item. A changed stock count is recorded as an adjustment transaction. */
export async function updateItem(shopId: string, id: string, input: ItemInput) {
  if (!uuidSchema.safeParse(id).success) throw new DataError(null, "Item not found");
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(items)
        .where(and(eq(items.id, id), eq(items.shopId, shopId), isNull(items.deletedAt)))
        .for("update");
      if (!current) throw new DataError(null, "Item not found");
      await assertCategory(tx, shopId, input.categoryId);

      const newStock = round3(input.currentStock);
      const delta = round3(newStock - Number(current.currentStock));
      const [item] = await tx
        .update(items)
        .set({
          categoryId: input.categoryId,
          name: input.name,
          unit: input.unit,
          price: String(input.price),
          currentStock: String(newStock),
          lowStockThreshold: String(round3(input.lowStockThreshold)),
          updatedAt: new Date(),
        })
        .where(eq(items.id, id))
        .returning();
      if (delta !== 0) {
        await tx.insert(transactions).values({
          shopId,
          itemId: id,
          type: "adjustment",
          quantity: String(delta),
          rawText: "Stock corrected on item page",
        });
      }
      return item;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DataError("name", DUPLICATE);
    throw e;
  }
}

/** Soft delete: hidden from lists, history kept. */
export async function softDeleteItem(shopId: string, id: string) {
  if (!uuidSchema.safeParse(id).success) throw new DataError(null, "Item not found");
  const [row] = await db
    .update(items)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.shopId, shopId), isNull(items.deletedAt)))
    .returning({ id: items.id });
  if (!row) throw new DataError(null, "Item not found");
}
