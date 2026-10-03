import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { deleteCategory, listCategories } from "@/lib/data/categories";
import { createItem, getItem, listItems, softDeleteItem, updateItem } from "@/lib/data/items";
import { createShopForUser } from "@/lib/onboarding";

// Needs a real database; skipped in CI where DATABASE_URL isn't set.
const run = process.env.DATABASE_URL ? describe : describe.skip;

run("shop scoping (integration)", () => {
  const tag = `it-${Date.now()}`;
  const emails = [`${tag}-a@test.local`, `${tag}-b@test.local`];
  let shopA = "";
  let shopB = "";
  let catA = "";
  let catB = "";
  let itemA = "";

  const input = (categoryId: string, stock = 10) => ({
    name: "Scoping Test Rice",
    categoryId,
    unit: "bag",
    price: 100,
    currentStock: stock,
    lowStockThreshold: 2,
  });

  beforeAll(async () => {
    const [ua, ub] = await db
      .insert(users)
      .values(emails.map((email) => ({ email })))
      .returning();
    shopA = (await createShopForUser(ua.id, "Shop A"))!.id;
    shopB = (await createShopForUser(ub.id, "Shop B"))!.id;
    catA = (await listCategories(shopA))[0].id;
    catB = (await listCategories(shopB))[0].id;
    itemA = (await createItem(shopA, input(catA))).id;
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.email, emails));
    await db.$client.end();
  });

  it("hides another shop's items", async () => {
    expect(await getItem(shopB, itemA)).toBeNull();
    expect((await listItems(shopB)).map((i) => i.id)).not.toContain(itemA);
    expect((await listItems(shopA)).map((i) => i.id)).toContain(itemA);
  });

  it("blocks updating or deleting another shop's item", async () => {
    await expect(updateItem(shopB, itemA, input(catB, 0))).rejects.toThrow("Item not found");
    await expect(softDeleteItem(shopB, itemA)).rejects.toThrow("Item not found");
    expect((await getItem(shopA, itemA))?.currentStock).toBe("10.000");
  });

  it("blocks using another shop's category", async () => {
    await expect(createItem(shopB, { ...input(catA), name: "X" })).rejects.toThrow(
      "Pick a category",
    );
    await expect(updateItem(shopA, itemA, input(catB))).rejects.toThrow("Pick a category");
  });

  it("records opening stock and stock edits in the ledger", async () => {
    await updateItem(shopA, itemA, input(catA, 7));
    const txs = await db.select().from(transactions).where(eq(transactions.itemId, itemA));
    const sum = txs.reduce((s, t) => s + Number(t.quantity) * (t.type === "sale" ? -1 : 1), 0);
    expect(txs.map((t) => t.type).sort()).toEqual(["adjustment", "restock"]);
    expect(sum).toBe(7);
  });

  it("rejects duplicate names within a shop but allows them across shops", async () => {
    await expect(createItem(shopA, input(catA))).rejects.toThrow("already have an item");
    const b = await createItem(shopB, input(catB, 0));
    expect(b.shopId).toBe(shopB);
  });

  it("blocks deleting a category that still has items", async () => {
    await expect(deleteCategory(shopA, catA)).rejects.toThrow(/Move or delete its 1 item/);
    await expect(deleteCategory(shopB, catA)).rejects.toThrow("Category not found");
  });
});
