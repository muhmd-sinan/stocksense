// Compares the two demand estimators on simulated history: for each item and each cut-off
// day, estimate units/day from the 14 days before and compare with the next 7 days' actual mean.
// Run: npx tsx scripts/backtest-forecast.ts
import { averageRate, dailySeries, ewmaRate } from "../src/lib/forecast";
import { CATALOG } from "./seed-catalog";
import { simulate } from "./seed-sim";

const DAY = 86_400_000;
const HORIZON = 7;
const flat = Object.values(CATALOG).flatMap((list) => list.map((i) => ({ ...i, key: i.name })));
const err = { average: 0, ewma: 0 };
let n = 0;

for (const seed of [1, 2, 3, 4, 5, 2026]) {
  const now = new Date("2026-09-30T10:00:00Z");
  const { txs, createdAt } = simulate(flat, { days: 90, now, seed });
  for (const item of flat) {
    const sales = txs.filter((t) => t.key === item.key && t.type === "sale");
    for (let cut = 60; cut >= HORIZON + 1; cut--) {
      const at = new Date(now.getTime() - cut * DAY);
      const hist = dailySeries(sales, createdAt[item.key], at);
      if (hist.length < 3) continue;
      const future = dailySeries(
        sales,
        createdAt[item.key],
        new Date(at.getTime() + HORIZON * DAY),
        HORIZON,
      );
      const actual = averageRate(future);
      err.average += Math.abs(averageRate(hist) - actual);
      err.ewma += Math.abs(ewmaRate(hist) - actual);
      n++;
    }
  }
}
console.log(`cases: ${n}`);
console.log(
  `MAE units/day: average ${(err.average / n).toFixed(4)}, ewma ${(err.ewma / n).toFixed(4)}`,
);
