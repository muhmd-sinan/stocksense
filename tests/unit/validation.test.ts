import { describe, expect, it } from "vitest";
import { formatDay, formatINR, formatQty, formatWhen } from "@/lib/format";
import { categorySchema, itemSchema } from "@/lib/validation";

const base = {
  name: " Matta Rice 5kg ",
  categoryId: "3f2b8c3e-1d4a-4b6e-9f1a-2c3d4e5f6a7b",
  unit: "bag",
  price: "310",
  currentStock: "12.5",
  lowStockThreshold: "4",
};

describe("itemSchema", () => {
  it("parses and trims a valid item", () => {
    const r = itemSchema.parse(base);
    expect(r).toMatchObject({ name: "Matta Rice 5kg", price: 310, currentStock: 12.5 });
  });

  it("rejects empty numbers instead of treating them as 0", () => {
    const r = itemSchema.safeParse({ ...base, price: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["price"]);
  });

  it("rejects negative stock and non-numbers", () => {
    expect(itemSchema.safeParse({ ...base, currentStock: "-1" }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, price: "abc" }).success).toBe(false);
  });

  it("rejects a missing or malformed category id", () => {
    expect(itemSchema.safeParse({ ...base, categoryId: "" }).success).toBe(false);
    expect(itemSchema.safeParse({ ...base, categoryId: "1 or 1=1" }).success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("requires a non-blank name", () => {
    expect(categorySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(categorySchema.parse({ name: " Snacks " }).name).toBe("Snacks");
  });
});

describe("format", () => {
  it("trims trailing zeros from numeric strings", () => {
    expect(formatQty("12.000")).toBe("12");
    expect(formatQty("2.500")).toBe("2.5");
    expect(formatQty("0.125")).toBe("0.125");
  });
  it("formats rupees", () => {
    expect(formatINR("1250.00")).toMatch(/₹\s?1,250/);
  });
});

describe("dates in IST", () => {
  const now = new Date("2026-10-05T09:00:00Z"); // 2:30 pm IST
  it("labels today and yesterday by the IST calendar day", () => {
    expect(formatWhen(new Date("2026-10-05T09:00:00Z"), now)).toMatch(/^Today, 2:30\spm$/);
    // 11:59 pm vs 12:01 am IST on either side of midnight
    expect(formatWhen(new Date("2026-10-04T18:29:00Z"), now)).toMatch(/^Yesterday, 11:59\spm$/);
    expect(formatWhen(new Date("2026-10-04T18:31:00Z"), now)).toMatch(/^Today, 12:01\sam$/);
  });
  it("uses a short date for older entries", () => {
    expect(formatWhen(new Date("2026-10-03T12:00:00Z"), now)).toMatch(/^3 Oct, 5:30\spm$/);
    expect(formatDay(now)).toBe("Mon, 5 Oct");
  });
});
