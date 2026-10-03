import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// WebSocket-based Pool (not neon-http) so multi-statement DB transactions work.
// Node 22+ has a global WebSocket, so no `ws` polyfill is needed.
// The Pool doesn't connect until the first query, so importing this module without
// DATABASE_URL (e.g. during `next build` or in CI) is safe.
const globalForDb = globalThis as unknown as { pool?: Pool };

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  console.warn("DATABASE_URL is not set. Copy .env.example to .env.");
}

const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
