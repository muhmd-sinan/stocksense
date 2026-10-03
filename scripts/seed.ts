import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { categories, items, shops, transactions, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { CATALOG } from "./seed-catalog";
import { simulate } from "./seed-sim";

const DEMO_EMAIL = "demo@stocksense.local";
const DEMO_PASSWORD = "demo1234";

async function main() {
  const now = new Date();
  const flat = Object.entries(CATALOG).flatMap(([category, list]) =>
    list.map((i) => ({ ...i, key: i.name, category })),
  );
  const { txs, finalStock, createdAt } = simulate(flat, { days: 60, now, seed: 2026 });
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await db.transaction(async (tx) => {
    // Idempotent: wipe the previous demo user (cascades to shop and its data)
    await tx.delete(users).where(eq(users.email, DEMO_EMAIL));

    const [user] = await tx
      .insert(users)
      .values({ email: DEMO_EMAIL, name: "Demo Owner", passwordHash })
      .returning();
    const [shop] = await tx
      .insert(shops)
      .values({ name: "Chettan's Stores, Edappally", ownerUserId: user.id })
      .returning();

    const cats = await tx
      .insert(categories)
      .values(Object.keys(CATALOG).map((name) => ({ shopId: shop.id, name })))
      .returning();
    const catId = Object.fromEntries(cats.map((c) => [c.name, c.id]));

    const inserted = await tx
      .insert(items)
      .values(
        flat.map((i) => ({
          shopId: shop.id,
          categoryId: catId[i.category],
          name: i.name,
          unit: i.unit,
          price: i.price.toFixed(2),
          currentStock: String(finalStock[i.key]),
          lowStockThreshold: String(i.threshold),
          createdAt: createdAt[i.key],
          updatedAt: now,
        })),
      )
      .returning({ id: items.id, name: items.name });
    const itemId = Object.fromEntries(inserted.map((i) => [i.name, i.id]));
    const price = Object.fromEntries(flat.map((i) => [i.key, i.price]));

    const rows = txs.map((t) => ({
      shopId: shop.id,
      itemId: itemId[t.key],
      type: t.type,
      quantity: String(t.quantity),
      unitPrice: t.type === "sale" ? price[t.key].toFixed(2) : null,
      rawText: t.type === "sale" ? `sold ${t.quantity} ${t.key}` : null,
      createdAt: t.at,
    }));
    for (let i = 0; i < rows.length; i += 1000) {
      await tx.insert(transactions).values(rows.slice(i, i + 1000));
    }

    console.log(
      `Seeded "${shop.name}": ${cats.length} categories, ${inserted.length} items, ${rows.length} transactions`,
    );
  });

  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await db.$client.end();
}

main().catch(async (e) => {
  console.error(e);
  await db.$client.end().catch(() => {});
  process.exit(1);
});
