import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, items, transactions } from "@/db/schema";
import { toNum } from "@/lib/format";
import { istDayStart } from "@/lib/forecast";
import { rangeStart, TOP_ITEMS_DAYS, type DayPoint } from "@/lib/insights";

// Sales analytics. Every query is scoped by shop on both transactions and items, and
// counts sales only. Deleted items are included: their past sales still happened.

const units = sql<string>`coalesce(sum(${transactions.quantity}), 0)`;
const revenue = sql<string>`coalesce(sum(${transactions.quantity} * coalesce(${transactions.unitPrice}, 0)), 0)`;
const saleCount = sql<number>`count(*)::int`;
const istDay = sql<string>`to_char(${transactions.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`;

function salesWhere(shopId: string, since: Date, categoryId?: string | null): SQL {
  const conds = [
    eq(transactions.shopId, shopId),
    eq(items.shopId, shopId),
    eq(transactions.type, "sale"),
    gte(transactions.createdAt, since),
  ];
  if (categoryId) conds.push(eq(items.categoryId, categoryId));
  return and(...conds)!;
}

export type Summary = { sales: number; units: number; revenue: number };

/** Sales since midnight IST today */
export async function getTodaySummary(
  shopId: string,
  categoryId: string | null = null,
  now = new Date(),
): Promise<Summary> {
  const [row] = await db
    .select({ sales: saleCount, units, revenue })
    .from(transactions)
    .innerJoin(items, eq(items.id, transactions.itemId))
    .where(salesWhere(shopId, new Date(istDayStart(now.getTime())), categoryId));
  return { sales: row?.sales ?? 0, units: toNum(row?.units), revenue: toNum(row?.revenue) };
}

/** Per IST day over the range. Days without sales are missing; fill with `fillDays`. */
export async function salesByDay(
  shopId: string,
  days: number,
  categoryId: string | null = null,
  now = new Date(),
): Promise<DayPoint[]> {
  const rows = await db
    .select({ day: istDay, sales: saleCount, units, revenue })
    .from(transactions)
    .innerJoin(items, eq(items.id, transactions.itemId))
    .where(salesWhere(shopId, rangeStart(now, days), categoryId))
    .groupBy(istDay)
    .orderBy(istDay);
  return rows.map((r) => ({
    day: r.day,
    sales: r.sales,
    units: toNum(r.units),
    revenue: toNum(r.revenue),
  }));
}

export type CategoryPoint = { id: string; name: string; units: number; revenue: number };

/** Revenue per category over the range, highest first */
export async function salesByCategory(
  shopId: string,
  days: number,
  categoryId: string | null = null,
  now = new Date(),
): Promise<CategoryPoint[]> {
  const rows = await db
    .select({ id: categories.id, name: categories.name, units, revenue })
    .from(transactions)
    .innerJoin(items, eq(items.id, transactions.itemId))
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .where(salesWhere(shopId, rangeStart(now, days), categoryId))
    .groupBy(categories.id, categories.name)
    .orderBy(desc(revenue));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    units: toNum(r.units),
    revenue: toNum(r.revenue),
  }));
}

export type TopItem = { id: string; name: string; unit: string; units: number; revenue: number };

/** Best sellers by units over the last 7 days (including today) */
export async function topItems(
  shopId: string,
  categoryId: string | null = null,
  now = new Date(),
  limit = 5,
): Promise<TopItem[]> {
  const rows = await db
    .select({ id: items.id, name: items.name, unit: items.unit, units, revenue })
    .from(transactions)
    .innerJoin(items, eq(items.id, transactions.itemId))
    .where(salesWhere(shopId, rangeStart(now, TOP_ITEMS_DAYS), categoryId))
    .groupBy(items.id, items.name, items.unit)
    .orderBy(desc(units), items.name)
    .limit(limit);
  return rows.map((r) => ({ ...r, units: toNum(r.units), revenue: toNum(r.revenue) }));
}
