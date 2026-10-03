import { and, eq, gte, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { items, transactions } from "@/db/schema";
import { dailySeries, forecast, isLowStock, WINDOW_DAYS, type Forecast } from "@/lib/forecast";
import { toNum } from "@/lib/format";

export type StockStatus = {
  id: string;
  name: string;
  categoryId: string;
  unit: string;
  stock: number;
  threshold: number;
  forecast: Forecast;
  low: boolean;
  reason: "out" | "threshold" | "days_left" | null;
};

/** Every live item with its forecast. One query for items, one for the last 15 days of sales. */
export async function listStockStatus(shopId: string, now = new Date()): Promise<StockStatus[]> {
  const since = new Date(now.getTime() - (WINDOW_DAYS + 1) * 86_400_000);
  const [rows, sales] = await Promise.all([
    db
      .select({
        id: items.id,
        name: items.name,
        categoryId: items.categoryId,
        unit: items.unit,
        currentStock: items.currentStock,
        lowStockThreshold: items.lowStockThreshold,
        createdAt: items.createdAt,
      })
      .from(items)
      .where(and(eq(items.shopId, shopId), isNull(items.deletedAt))),
    db
      .select({
        itemId: transactions.itemId,
        quantity: transactions.quantity,
        at: transactions.createdAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.shopId, shopId),
          eq(transactions.type, "sale"),
          gte(transactions.createdAt, since),
        ),
      ),
  ]);

  const byItem = new Map<string, { at: Date; quantity: number }[]>();
  for (const s of sales) {
    const list = byItem.get(s.itemId) ?? [];
    list.push({ at: s.at, quantity: toNum(s.quantity) });
    byItem.set(s.itemId, list);
  }

  return rows.map((r) => {
    const stock = toNum(r.currentStock);
    const threshold = toNum(r.lowStockThreshold);
    const f = forecast(stock, dailySeries(byItem.get(r.id) ?? [], r.createdAt, now));
    const low = isLowStock(stock, threshold, f.daysLeft);
    const reason = !low
      ? null
      : stock <= 0
        ? "out"
        : stock <= threshold
          ? "threshold"
          : "days_left";
    return {
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      unit: r.unit,
      stock,
      threshold,
      forecast: f,
      low,
      reason,
    };
  });
}

/** Low-stock items, most urgent first: out of stock, then fewest days left, then by name. */
export async function listLowStock(shopId: string, now = new Date()): Promise<StockStatus[]> {
  const all = await listStockStatus(shopId, now);
  const urgency = (s: StockStatus) =>
    s.stock <= 0 ? -1 : (s.forecast.daysLeft ?? Number.POSITIVE_INFINITY);
  return all
    .filter((s) => s.low)
    .sort((a, b) => urgency(a) - urgency(b) || a.name.localeCompare(b.name));
}

/** Per-request cached, so the layout badge and the alerts page share one query. */
export const getLowStock = cache(listLowStock);
