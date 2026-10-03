import "dotenv/config";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { listCategories } from "@/lib/data/categories";
import { getTodaySummary, salesByCategory, salesByDay, topItems } from "@/lib/data/insights";
import { createItem } from "@/lib/data/items";
import { createShopForUser } from "@/lib/onboarding";

// Needs a real database; skipped in CI where DATABASE_URL isn't set.
const run = process.env.DATABASE_URL ? describe : describe.skip;
const DAY = 86_400_000;

run("insights queries (integration)", () => {
  const tag = `it-insights-${Date.now()}`;
  const emails = [`${tag}-a@test.local`, `${tag}-b@test.local`];
  const now = new Date();
  let shopA = "";
  let shopB = "";
  let grains = "";
  let oils = "";

  beforeAll(async () => {
    const [ua, ub] = await db
      .insert(users)
      .values(emails.map((email) => ({ email })))
      .returning();
    shopA = (await createShopForUser(ua.id, "Insights A"))!.id;
    shopB = (await createShopForUser(ub.id, "Insights B"))!.id;
    const cats = await listCategories(shopA);
    grains = cats.find((c) => c.name === "Grains")!.id;
    oils = cats.find((c) => c.name === "Oils")!.id;
    const base = { unit: "pack", currentStock: 0, lowStockThreshold: 0 };
    const rice = await createItem(shopA, { ...base, name: "Rice", categoryId: grains, price: 50 });
    const oil = await createItem(shopA, { ...base, name: "Oil", categoryId: oils, price: 200 });
    const sale = (itemId: string, quantity: number, price: number, daysAgo: number) => ({
      shopId: shopA,
      itemId,
      type: "sale" as const,
      quantity: String(quantity),
      unitPrice: String(price),
      createdAt: new Date(now.getTime() - daysAgo * DAY),
    });
    await db.insert(transactions).values([
      sale(rice.id, 2, 50, 0), // today: 100
      sale(oil.id, 1, 200, 0), // today: 200
      sale(rice.id, 5, 50, 3), // this week: 250
      sale(oil.id, 3, 200, 20), // within 30 days only: 600
      sale(rice.id, 9, 50, 60), // within 90 days only: 450
      { ...sale(rice.id, 10, 50, 0), type: "restock" as const, unitPrice: null }, // not a sale
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.email, emails));
    await db.$client.end();
  });

  it("summarises today's sales only", async () => {
    expect(await getTodaySummary(shopA, null, now)).toEqual({ sales: 2, units: 3, revenue: 300 });
    expect(await getTodaySummary(shopA, oils, now)).toEqual({ sales: 1, units: 1, revenue: 200 });
  });

  it("respects the 7 / 30 / 90 day range", async () => {
    const total = async (d: number) =>
      (await salesByDay(shopA, d, null, now)).reduce((s, r) => s + r.revenue, 0);
    expect(await total(7)).toBe(550);
    expect(await total(30)).toBe(1150);
    expect(await total(90)).toBe(1600);
  });

  it("groups by category, highest revenue first, and filters", async () => {
    const all = await salesByCategory(shopA, 30, null, now);
    expect(all.map((c) => [c.name, c.revenue])).toEqual([
      ["Oils", 800],
      ["Grains", 350],
    ]);
    expect((await salesByCategory(shopA, 30, grains, now)).map((c) => c.name)).toEqual(["Grains"]);
  });

  it("ranks top items by units over the last 7 days", async () => {
    const top = await topItems(shopA, null, now);
    expect(top.map((t) => [t.name, t.units])).toEqual([
      ["Rice", 7],
      ["Oil", 1],
    ]);
  });

  it("never shows another shop's sales, even with its category id", async () => {
    expect(await getTodaySummary(shopB, null, now)).toEqual({ sales: 0, units: 0, revenue: 0 });
    expect(await salesByDay(shopB, 90, grains, now)).toEqual([]);
    expect(await topItems(shopB, oils, now)).toEqual([]);
  });
});
