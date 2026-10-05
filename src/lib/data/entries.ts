import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { items, transactions } from "@/db/schema";
import { formatQty, round3, toNum } from "@/lib/format";
import type { EntryInput } from "@/lib/parser/draft";
import { DataError, isCheckViolation, isUniqueViolation } from "./errors";
import { assertCategory } from "./items";

export type AppliedLine = {
  type: EntryInput["type"];
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  threshold: number;
  price: number; // per unit, after this line
};

/**
 * Applies confirmed entry lines in ONE database transaction: all lines save or none do.
 * Item rows are locked while their stock is changed, and every change is written to the ledger.
 */
export async function applyEntries(
  shopId: string,
  entries: EntryInput[],
  rawText: string,
): Promise<AppliedLine[]> {
  const note = rawText.slice(0, 500);
  try {
    return await db.transaction(async (tx) => {
      const out: AppliedLine[] = [];
      for (const e of entries) {
        if (e.type === "create_item") {
          await assertCategory(tx, shopId, e.categoryId);
          const qty = round3(e.quantity);
          const [item] = await tx
            .insert(items)
            .values({
              shopId,
              categoryId: e.categoryId,
              name: e.name,
              unit: e.unit,
              price: String(e.price),
              currentStock: String(qty),
            })
            .returning();
          if (qty > 0)
            await tx.insert(transactions).values({
              shopId,
              itemId: item.id,
              type: "restock",
              quantity: String(qty),
              rawText: note,
            });
          out.push({
            type: e.type,
            itemId: item.id,
            name: item.name,
            unit: item.unit,
            quantity: qty,
            stockBefore: 0,
            stockAfter: qty,
            threshold: 0,
            price: e.price,
          });
          continue;
        }

        const [item] = await tx
          .select()
          .from(items)
          .where(and(eq(items.id, e.itemId), eq(items.shopId, shopId), isNull(items.deletedAt)))
          .for("update");
        if (!item)
          throw new DataError(
            null,
            "One of the items no longer exists. Refresh the page and try again.",
          );
        const before = toNum(item.currentStock);
        const threshold = toNum(item.lowStockThreshold);
        const base = { itemId: item.id, name: item.name, unit: item.unit, stockBefore: before };

        if (e.type === "update_threshold") {
          const t = round3(e.threshold);
          await tx
            .update(items)
            .set({ lowStockThreshold: String(t), updatedAt: new Date() })
            .where(eq(items.id, item.id));
          out.push({
            ...base,
            type: e.type,
            quantity: t,
            stockAfter: before,
            threshold: t,
            price: toNum(item.price),
          });
          continue;
        }

        const qty = round3(e.quantity);
        if (qty <= 0) throw new DataError(null, `Quantity for ${item.name} is too small`);
        let after: number;

        if (e.type === "restock") {
          after = round3(before + qty);
          await tx.insert(transactions).values({
            shopId,
            itemId: item.id,
            type: "restock",
            quantity: String(qty),
            rawText: note,
          });
          // The Bought tab carries the selling price: a changed price updates the item
          if (e.price != null && e.price !== toNum(item.price))
            await tx
              .update(items)
              .set({ price: String(e.price), updatedAt: new Date() })
              .where(eq(items.id, item.id));
        } else {
          if (qty > before) {
            if (!e.allowOversell)
              throw new DataError(
                null,
                `Only ${formatQty(before)} ${item.unit} of ${item.name} in stock. Confirm the oversell to save.`,
              );
            // The recorded count was too low: correct it first so the ledger explains the sale
            await tx.insert(transactions).values({
              shopId,
              itemId: item.id,
              type: "adjustment",
              quantity: String(round3(qty - before)),
              rawText: "Stock corrected: sold more than recorded",
            });
          }
          after = round3(Math.max(0, before - qty));
          await tx.insert(transactions).values({
            shopId,
            itemId: item.id,
            type: "sale",
            quantity: String(qty),
            unitPrice: item.price,
            rawText: note,
          });
        }
        await tx
          .update(items)
          .set({ currentStock: String(after), updatedAt: new Date() })
          .where(eq(items.id, item.id));
        const price = e.type === "restock" && e.price != null ? e.price : toNum(item.price);
        out.push({ ...base, type: e.type, quantity: qty, stockAfter: after, threshold, price });
      }
      return out;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DataError(null, "You already have an item with that name");
    if (isCheckViolation(e)) throw new DataError(null, "That would make stock go below 0");
    throw e;
  }
}

/** Latest sales and purchases for the Entry page. Deleted items still show: the entry happened. */
export async function listRecentEntries(shopId: string, limit = 8) {
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      quantity: transactions.quantity,
      unitPrice: transactions.unitPrice,
      createdAt: transactions.createdAt,
      name: items.name,
      unit: items.unit,
    })
    .from(transactions)
    .innerJoin(items, eq(items.id, transactions.itemId))
    .where(
      and(
        eq(transactions.shopId, shopId),
        eq(items.shopId, shopId),
        inArray(transactions.type, ["sale", "restock"]),
      ),
    )
    // Lines saved together share a timestamp; name keeps their order stable
    .orderBy(desc(transactions.createdAt), asc(items.name))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type as "sale" | "restock",
    name: r.name,
    unit: r.unit,
    quantity: toNum(r.quantity),
    amount:
      r.type === "sale" ? Math.round(toNum(r.quantity) * toNum(r.unitPrice) * 100) / 100 : null,
    createdAt: r.createdAt,
  }));
}
export type RecentEntry = Awaited<ReturnType<typeof listRecentEntries>>[number];
