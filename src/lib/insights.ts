// Pure helpers for the insights dashboard: range parsing and IST day keys.
// No DB access, so they're unit-tested and safe on either side of the network.

import { istDayStart } from "@/lib/forecast";

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULT_RANGE: Range = 30;
export const TOP_ITEMS_DAYS = 7;

const DAY = 86_400_000;
const IST_OFFSET = 5.5 * 3_600_000;

/** "7" → 7; anything else → the default, so a bad URL never errors */
export function parseRange(v: string | undefined): Range {
  const n = Number(v);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : DEFAULT_RANGE;
}

/** Start of the window: midnight IST, `days` days including today */
export function rangeStart(now: Date, days: number): Date {
  return new Date(istDayStart(now.getTime()) - (days - 1) * DAY);
}

/** "YYYY-MM-DD" of the IST calendar day containing `t` (matches the SQL grouping) */
export function istDayKey(t: number): string {
  return new Date(t + IST_OFFSET).toISOString().slice(0, 10);
}

/** The last `days` IST day keys, oldest → newest, including today */
export function dayKeys(now: Date, days: number): string[] {
  const start = rangeStart(now, days).getTime();
  return Array.from({ length: days }, (_, i) => istDayKey(start + i * DAY));
}

export type DayPoint = { day: string; units: number; revenue: number; sales: number };

/** Adds zero days so the line chart doesn't skip days with no sales */
export function fillDays(rows: DayPoint[], keys: string[]): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return keys.map((day) => byDay.get(day) ?? { day, units: 0, revenue: 0, sales: 0 });
}

const dayLabel = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "2026-09-30" → "30 Sep" */
export function formatDayKey(key: string): string {
  return dayLabel.format(new Date(`${key}T00:00:00Z`));
}
