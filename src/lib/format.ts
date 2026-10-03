// Drizzle returns Postgres numeric columns as strings.
export function toNum(v: string | number | null | undefined): number {
  return v == null ? 0 : Number(v);
}

/** 3 → "3", 2.5 → "2.5", 0.125 → "0.125" */
export function formatQty(v: string | number | null | undefined): string {
  const n = toNum(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, "");
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(v: string | number | null | undefined): string {
  return inr.format(toNum(v));
}

/** Round to the 3 decimals Postgres stores for quantities */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
