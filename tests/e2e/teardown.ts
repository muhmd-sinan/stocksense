import "dotenv/config";
import { like } from "drizzle-orm";
import { db } from "../../src/db";
import { users } from "../../src/db/schema";

/** Deletes every throwaway E2E user; their shop, items and transactions cascade. */
export default async function teardown() {
  if (!process.env.DATABASE_URL) return;
  await db.delete(users).where(like(users.email, "e2e-%@stocksense.test"));
}
