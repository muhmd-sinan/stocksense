import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { listCategories } from "@/lib/data/categories";
import { applyEntries, listRecentEntries } from "@/lib/data/entries";
import { createItem, getItem } from "@/lib/data/items";
import { createShopForUser } from "@/lib/onboarding";

// Needs a real database; skipped in CI where DATABASE_URL isn't set.
const run = process.env.DATABASE_URL ? describe : describe.skip;

run("applyEntries (integration)", () => {
  const tag = `it-entries-${Date.now()}`;
  const emails = [`${tag}-a@test.local`, `${tag}-b@test.local`];
  let shopA = "";
  let shopB = "";
  let catA = "";
  let rice = "";
  let sugar = "";

  const stockOf = async (id: string) => Number((await getItem(shopA, id))!.currentStock);
  const ledgerSum = async (id: string) => {
    const txs = await db.select().from(transactions).where(eq(transactions.itemId, id));
    return txs.reduce((s, t) => s + Number(t.quantity) * (t.type === "sale" ? -1 : 1), 0);
  };
  const item = (name: string, stock: number) => ({
    name,
    categoryId: catA,
    unit: "bag",
    price: 50,
    currentStock: stock,
    lowStockThreshold: 2,
  });

  beforeAll(async () => {
    const [ua, ub] = await db
      .insert(users)
      .values(emails.map((email) => ({ email })))
      .returning();
    shopA = (await createShopForUser(ua.id, "Entries A"))!.id;
    shopB = (await createShopForUser(ub.id, "Entries B"))!.id;
    catA = (await listCategories(shopA))[0].id;
    rice = (await createItem(shopA, item("Entry Rice", 10))).id;
    sugar = (await createItem(shopA, item("Entry Sugar", 3))).id;
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.email, emails));
    await db.$client.end();
  });

  it("applies sales and restocks with ledger rows", async () => {
    const lines = await applyEntries(
      shopA,
      [
        { type: "sale", itemId: rice, quantity: 2, allowOversell: false },
        { type: "restock", itemId: sugar, quantity: 5 },
      ],
      "sold 2 rice, got 5 sugar",
    );
    expect(lines.map((l) => [l.stockBefore, l.stockAfter])).toEqual([
      [10, 8],
      [3, 8],
    ]);
    expect(await stockOf(rice)).toBe(8);
    expect(await ledgerSum(rice)).toBe(8);
    const [sale] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.itemId, rice), eq(transactions.type, "sale")));
    expect(sale).toMatchObject({ unitPrice: "50.00", rawText: "sold 2 rice, got 5 sugar" });
  });

  it("rolls back every line when one oversells without override", async () => {
    await expect(
      applyEntries(
        shopA,
        [
          { type: "sale", itemId: rice, quantity: 1, allowOversell: false },
          { type: "sale", itemId: sugar, quantity: 99, allowOversell: false },
        ],
        "x",
      ),
    ).rejects.toThrow(/Confirm the oversell/);
    expect(await stockOf(rice)).toBe(8);
    expect(await stockOf(sugar)).toBe(8);
  });

  it("oversell with override corrects stock, then sells to 0", async () => {
    await applyEntries(
      shopA,
      [{ type: "sale", itemId: sugar, quantity: 11, allowOversell: true }],
      "x",
    );
    expect(await stockOf(sugar)).toBe(0);
    expect(await ledgerSum(sugar)).toBe(0);
  });

  it("rejects another shop's item", async () => {
    await expect(
      applyEntries(shopB, [{ type: "restock", itemId: rice, quantity: 1 }], "x"),
    ).rejects.toThrow(/no longer exists/);
    expect(await stockOf(rice)).toBe(8);
  });

  it("creates items and updates thresholds", async () => {
    const [created, th] = await applyEntries(
      shopA,
      [
        {
          type: "create_item",
          name: "Entry Maggi 70g",
          unit: "pack",
          price: 14,
          quantity: 20,
          categoryId: catA,
        },
        { type: "update_threshold", itemId: rice, threshold: 4 },
      ],
      "x",
    );
    expect(created).toMatchObject({ stockAfter: 20 });
    expect(await ledgerSum(created.itemId)).toBe(20);
    expect(th.threshold).toBe(4);
    expect((await getItem(shopA, rice))!.lowStockThreshold).toBe("4.000");
    await expect(
      applyEntries(
        shopA,
        [
          {
            type: "create_item",
            name: "entry maggi 70g",
            unit: "pack",
            price: 1,
            quantity: 0,
            categoryId: catA,
          },
        ],
        "x",
      ),
    ).rejects.toThrow(/already have/);
  });

  it("a restock with a new price updates the item's price", async () => {
    const [line] = await applyEntries(
      shopA,
      [{ type: "restock", itemId: rice, quantity: 2, price: 55 }],
      "Bought on Entry page",
    );
    expect(line).toMatchObject({ stockBefore: 8, stockAfter: 10, price: 55 });
    expect((await getItem(shopA, rice))!.price).toBe("55.00");
  });

  it("lists recent sales and purchases for the shop only, newest first", async () => {
    const recent = await listRecentEntries(shopA, 50);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.every((r) => r.type === "sale" || r.type === "restock")).toBe(true);
    const times = recent.map((r) => r.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(recent.find((r) => r.type === "sale" && r.name === "Entry Rice")?.amount).toBe(100);
    expect(await listRecentEntries(shopB)).toEqual([]);
  });
});
