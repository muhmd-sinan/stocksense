import { describe, expect, it } from "vitest";
import { simulate, type SimItem } from "../../scripts/seed-sim";

const now = new Date("2026-09-30T10:00:00Z"); // 15:30 IST

const items: SimItem[] = [
  { key: "rice", demand: 3, openingStock: 40, reorderAt: 10, reorderQty: 30 },
  { key: "milk", demand: 22, openingStock: 40, reorderAt: 30, reorderQty: 30 },
  { key: "new", demand: 2, openingStock: 12, reorderAt: 0, reorderQty: 0, ageDays: 6 },
  // Never restocked, but has a reorder point (like Boost): must not emit 0-qty restocks
  { key: "never", demand: 1, openingStock: 5, reorderAt: 3, reorderQty: 0 },
  {
    key: "dying",
    demand: 1,
    openingStock: 15,
    reorderAt: 3,
    reorderQty: 10,
    noRestockLastDays: 20,
  },
];

describe("seed simulation", () => {
  const { txs, finalStock, createdAt } = simulate(items, { days: 60, now, seed: 1 });

  it("never lets running stock go negative and matches final stock", () => {
    for (const { key } of items) {
      let stock = 0;
      for (const t of txs.filter((t) => t.key === key)) {
        stock += t.type === "restock" ? t.quantity : -t.quantity;
        expect(stock).toBeGreaterThanOrEqual(0);
      }
      expect(stock).toBe(finalStock[key]);
    }
  });

  it("has no transactions in the future or before the item existed", () => {
    for (const t of txs) {
      expect(t.at.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(t.at.getTime()).toBeGreaterThanOrEqual(createdAt[t.key].getTime());
    }
  });

  it("respects item age", () => {
    const ageMs = now.getTime() - createdAt.new.getTime();
    expect(ageMs).toBeLessThan(7 * 86_400_000);
  });

  it("stops restocking when asked, so stock drains", () => {
    const lastRestock = txs.filter((t) => t.key === "dying" && t.type === "restock").at(-1)!;
    expect(now.getTime() - lastRestock.at.getTime()).toBeGreaterThan(19 * 86_400_000);
  });

  it("is deterministic for a given seed", () => {
    const again = simulate(items, { days: 60, now, seed: 1 });
    expect(again.txs.length).toBe(txs.length);
    expect(again.finalStock).toEqual(finalStock);
  });

  it("only uses positive quantities", () => {
    expect(txs.every((t) => t.quantity > 0)).toBe(true);
  });
});
