import { describe, expect, it } from "vitest";
import { dayKeys, fillDays, formatDayKey, istDayKey, parseRange, rangeStart } from "@/lib/insights";

const now = new Date("2026-09-30T20:00:00Z"); // 01:30 IST on 1 Oct

describe("insights helpers", () => {
  it("accepts only 7/30/90, defaulting to 30", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange("90")).toBe(90);
    for (const bad of [undefined, "", "14", "abc", "-7"]) expect(parseRange(bad)).toBe(30);
  });

  it("uses IST calendar days, not UTC", () => {
    expect(istDayKey(now.getTime())).toBe("2026-10-01");
    expect(rangeStart(now, 1).toISOString()).toBe("2026-09-30T18:30:00.000Z");
  });

  it("lists the last N days including today, oldest first", () => {
    const keys = dayKeys(now, 7);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2026-09-25");
    expect(keys.at(-1)).toBe("2026-10-01");
  });

  it("fills days without sales with zeros", () => {
    const filled = fillDays(
      [{ day: "2026-09-30", units: 3, revenue: 90, sales: 2 }],
      dayKeys(now, 3),
    );
    expect(filled.map((d) => d.revenue)).toEqual([0, 90, 0]);
  });

  it("formats day keys for axes", () => {
    expect(formatDayKey("2026-09-30")).toBe("30 Sept");
  });
});
