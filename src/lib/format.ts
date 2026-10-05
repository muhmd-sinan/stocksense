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

// Dates are shown in shop time (IST) wherever the server or browser runs
const IST = "Asia/Kolkata";
const istDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: IST, dateStyle: "short" });
const istTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
});
const istShortDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
});
const istLongDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Today, 3:42 pm" / "Yesterday, 9:05 am" / "3 Oct, 6:10 pm" */
export function formatWhen(d: Date, now = new Date()): string {
  const day = istDayKey.format(d);
  // IST has no daylight saving, so 24h back is always yesterday
  const label =
    day === istDayKey.format(now)
      ? "Today"
      : day === istDayKey.format(new Date(now.getTime() - 86_400_000))
        ? "Yesterday"
        : istShortDate.format(d);
  return `${label}, ${istTime.format(d)}`;
}

/** "Mon, 5 Oct" */
export function formatDay(d: Date): string {
  return istLongDate.format(d);
}
