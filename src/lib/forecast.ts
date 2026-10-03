// Demand forecast: how many days until an item runs out. Pure, so it's unit-tested
// and backtested (scripts/backtest-forecast.ts) without a database.
//
// Two estimators of units sold per day over the last complete days:
// - average: plain mean over the window (or the item's age if younger)
// - ewma: exponentially weighted, alpha 0.3, reacts faster to recent change
// Backtest (scripts/backtest-forecast.ts, 9,222 cases, next-7-day actual): mean abs error
// average 0.64 vs EWMA 0.80 units/day. Demand here is steady with one-off spikes, where EWMA
// overreacts to a spike, so the plain average is the default. Revisit with real shop data.

export const WINDOW_DAYS = 14;
export const EWMA_ALPHA = 0.3;
export const DAYS_LEFT_ALERT = 3;
/** Fewer complete days than this and the rate is a rough guess */
export const MIN_DAYS_FOR_CONFIDENCE = 3;

const IST_OFFSET = 5.5 * 3_600_000;
const DAY = 86_400_000;

export type Method = "average" | "ewma";
export const FORECAST_METHOD: Method = "average";

/** Mean units/day. `daily` is oldest → newest complete days. */
export function averageRate(daily: number[]): number {
  if (!daily.length) return 0;
  return daily.reduce((s, n) => s + n, 0) / daily.length;
}

/** EWMA units/day, seeded with the mean so one odd first day doesn't dominate. */
export function ewmaRate(daily: number[], alpha = EWMA_ALPHA): number {
  if (!daily.length) return 0;
  let level = averageRate(daily);
  for (const n of daily) level = alpha * n + (1 - alpha) * level;
  return level;
}

export type Forecast = {
  dailyRate: number;
  /** null when nothing is selling (it won't run out) or there's no history yet */
  daysLeft: number | null;
  confidence: "none" | "low" | "ok";
  daysOfHistory: number;
};

export function forecast(
  stock: number,
  daily: number[],
  method: Method = FORECAST_METHOD,
): Forecast {
  const daysOfHistory = daily.length;
  if (!daysOfHistory) return { dailyRate: 0, daysLeft: null, confidence: "none", daysOfHistory };
  const rate = method === "ewma" ? ewmaRate(daily) : averageRate(daily);
  const dailyRate = Math.round(rate * 1000) / 1000;
  return {
    dailyRate,
    daysLeft: dailyRate > 0 ? Math.round((Math.max(0, stock) / dailyRate) * 10) / 10 : null,
    confidence: daysOfHistory < MIN_DAYS_FOR_CONFIDENCE ? "low" : "ok",
    daysOfHistory,
  };
}

/** Low stock: at or below the owner's alert level, or forecast to run out within 3 days. */
export function isLowStock(stock: number, threshold: number, daysLeft: number | null): boolean {
  return stock <= threshold || (daysLeft != null && daysLeft <= DAYS_LEFT_ALERT);
}

/** Start of the IST calendar day containing `t`, as a UTC instant */
export function istDayStart(t: number): number {
  return Math.floor((t + IST_OFFSET) / DAY) * DAY - IST_OFFSET;
}

/**
 * Units sold per complete IST day, oldest → newest, for the last WINDOW_DAYS days
 * (today is partial, so it's excluded). Days before the item existed are left out,
 * so a 5-day-old item averages over 5 days, not 14.
 */
export function dailySeries(
  sales: { at: Date; quantity: number }[],
  createdAt: Date,
  now: Date,
  window = WINDOW_DAYS,
): number[] {
  const today = istDayStart(now.getTime());
  const start = Math.max(today - window * DAY, istDayStart(createdAt.getTime()));
  const days = Math.max(0, Math.round((today - start) / DAY));
  const out = new Array<number>(days).fill(0);
  for (const s of sales) {
    const i = Math.floor((s.at.getTime() - start) / DAY);
    if (i >= 0 && i < days) out[i] += s.quantity;
  }
  return out;
}

/** Sale lines that took an item from above its alert level to at/below it (for the toast). */
export function crossedThreshold<
  T extends { type: string; stockBefore: number; stockAfter: number; threshold: number },
>(lines: T[]): T[] {
  return lines.filter(
    (l) => l.type === "sale" && l.stockBefore > l.threshold && l.stockAfter <= l.threshold,
  );
}
