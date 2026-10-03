import { db, type Tx } from "@/db";
import { categories, shops } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "./constants";

/** Creates a shop plus default categories for a new owner. */
export async function createShopForUser(userId: string, shopName: string, tx: Tx | typeof db = db) {
  const [shop] = await tx
    .insert(shops)
    .values({ name: shopName, ownerUserId: userId })
    .onConflictDoNothing({ target: shops.ownerUserId })
    .returning();
  if (!shop) return; // already onboarded
  await tx.insert(categories).values(DEFAULT_CATEGORIES.map((name) => ({ shopId: shop.id, name })));
  return shop;
}
