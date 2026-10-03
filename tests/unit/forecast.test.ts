import { describe, expect, it } from "vitest";
import {
  averageRate,
  crossedThreshold,
  dailySeries,
  ewmaRate,
  forecast,
  isLowStock,
  istDayStart,
} from "@/lib/forecast";

const DAY = 86_400_000;
const now = new Date("2026-09-30T10:00:00Z"); // 15:30 IST
const today = istDayStart(now.getTime());
const longAgo = new Date(today - 60 * DAY);
/** A sale at noon IST, `daysAgo` complete days before today */
const saleOn = (daysAgo: number, quantity: number) => ({
  at: new Date(today - daysAgo * DAY + 6.5 * 3_600_000),
  quantity,
});

describe("dailySeries", () => {
  it("buckets by IST day, excludes today, and covers 14 days", () => {
    const s = dailySeries([saleOn(1, 2), saleOn(1, 3), saleOn(14, 1), saleOn(0, 9)], longAgo, now);
    expect(s).toHaveLength(14);
    expect(s[13]).toBe(5); // yesterday
    expect(s[0]).toBe(1); // 14 days ago
    expect(s.reduce((a, b) => a + b, 0)).toBe(6); // today's 9 excluded
  });

  it("puts a 23:00 IST sale on that IST day, not the next UTC day", () => {
    // 23:00 IST yesterday is 17:30 UTC; 00:30 IST today is still "today" and excluded
    const late = { at: new Date(today - DAY + 23 * 3_600_000), quantity: 1 };
    const early = { at: new Date(today + 0.5 * 3_600_000), quantity: 4 };
    const s = dailySeries([late, early], longAgo, now);
    expect(s.at(-1)).toBe(1);
    expect(s.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("only counts days since the item was created", () => {
    const created = new Date(today - 5 * DAY + 3_600_000);
    expect(dailySeries([saleOn(2, 4)], created, now)).toHaveLength(5);
  });

  it("is empty for an item created today", () => {
    expect(dailySeries([saleOn(0, 3)], new Date(today + 3_600_000), now)).toEqual([]);
  });
});

describe("rates", () => {
  it("average and EWMA agree on flat demand", () => {
    expect(averageRate([2, 2, 2, 2])).toBe(2);
    expect(ewmaRate([2, 2, 2, 2])).toBeCloseTo(2);
  });

  it("EWMA reacts more to a recent spike than the average", () => {
    const spike = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 15];
    expect(averageRate(spike)).toBe(2);
    expect(ewmaRate(spike)).toBeGreaterThan(averageRate(spike));
  });
});

describe("forecast", () => {
  it("zero sales: nothing to forecast, won't run out", () => {
    expect(forecast(10, new Array(14).fill(0))).toMatchObject({
      dailyRate: 0,
      daysLeft: null,
      confidence: "ok",
    });
  });

  it("one sale in 14 days gives a slow rate", () => {
    const daily = new Array(14).fill(0);
    daily[5] = 7;
    expect(forecast(10, daily)).toMatchObject({ dailyRate: 0.5, daysLeft: 20 });
  });

  it("a spike day lifts the average but doesn't dominate", () => {
    const daily = new Array(14).fill(2);
    daily[13] = 30;
    const f = forecast(20, daily);
    expect(f.dailyRate).toBe(4);
    expect(f.daysLeft).toBe(5);
  });

  it("new item: rate over its own age, flagged low confidence", () => {
    const f = forecast(6, [3, 3]);
    expect(f).toMatchObject({ dailyRate: 3, daysLeft: 2, confidence: "low", daysOfHistory: 2 });
    expect(forecast(6, [])).toMatchObject({ daysLeft: null, confidence: "none" });
  });

  it("out of stock gives 0 days left", () => {
    expect(forecast(0, [1, 1, 1]).daysLeft).toBe(0);
  });

  it("can use EWMA", () => {
    expect(forecast(10, [0, 0, 10], "ewma").dailyRate).toBeGreaterThan(
      forecast(10, [0, 0, 10]).dailyRate,
    );
  });
});

describe("isLowStock", () => {
  it("flags at/below threshold or ≤ 3 days left", () => {
    expect(isLowStock(5, 5, null)).toBe(true);
    expect(isLowStock(6, 5, null)).toBe(false);
    expect(isLowStock(50, 5, 3)).toBe(true);
    expect(isLowStock(50, 5, 3.1)).toBe(false);
    expect(isLowStock(0, 0, null)).toBe(true);
  });
});

describe("crossedThreshold", () => {
  const line = (type: string, stockBefore: number, stockAfter: number, threshold = 5) => ({
    type,
    stockBefore,
    stockAfter,
    threshold,
  });
  it("only flags sales that cross from above to at/below the alert level", () => {
    const lines = [
      line("sale", 8, 5), // crosses
      line("sale", 4, 2), // already low
      line("sale", 10, 6), // still above
      line("restock", 8, 5), // not a sale
    ];
    expect(crossedThreshold(lines)).toEqual([lines[0]]);
  });
});
