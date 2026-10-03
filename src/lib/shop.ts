import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { shops } from "@/db/schema";

/**
 * The only way server code should learn which shop it's acting for.
 * Derived from the session, never from client input. Redirects to /login if signed out.
 */
export const getCurrentShop = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const shop = await db.query.shops.findFirst({ where: eq(shops.ownerUserId, userId) });
  if (!shop) throw new Error("Signed-in user has no shop");
  return shop;
});

export async function getCurrentShopId(): Promise<string> {
  return (await getCurrentShop()).id;
}
