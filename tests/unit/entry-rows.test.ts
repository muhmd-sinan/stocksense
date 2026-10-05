import { describe, expect, it } from "vitest";
import {
  checkBought,
  checkSold,
  emptyBought,
  emptySold,
  findItemByName,
  soldTotal,
  suggestItems,
  toBoughtEntries,
  toSoldEntries,
  withName,
  type BoughtRow,
  type EntryItem,
  type SoldRow,
} from "@/lib/entry-rows";
import { boughtEntriesSchema, soldEntriesSchema } from "@/lib/validation";

const CAT = "3f2b8c3e-1d4a-4b6e-9f1a-2c3d4e5f6a7b";
const SUGAR = "11111111-1111-4111-8111-111111111111";
const RICE = "22222222-2222-4222-8222-222222222222";
const item = (p: Partial<EntryItem> & Pick<EntryItem, "id" | "name">): EntryItem => ({
  unit: "pcs",
  price: 10,
  stock: 5,
  categoryId: CAT,
  lastBought: null,
  ...p,
});
const ITEMS: EntryItem[] = [
  item({ id: SUGAR, name: "Sugar 1kg", unit: "pack", price: 46, stock: 10, lastBought: 3000 }),
  item({ id: RICE, name: "Matta Rice 5kg", unit: "bag", price: 310, stock: 2, lastBought: 2000 }),
];

const sold = (p: Partial<SoldRow>, key = "s"): SoldRow => ({ ...emptySold(key), ...p });
const bought = (p: Partial<BoughtRow>, key = "b"): BoughtRow => ({ ...emptyBought(key), ...p });

describe("checkSold", () => {
  it("skips blank lines and asks for what's missing", () => {
    const [blank, noQty, noItem] = checkSold(
      [sold({}), sold({ itemId: SUGAR }), sold({ quantity: "2" })],
      ITEMS,
    );
    expect(blank).toMatchObject({ blank: true, errors: {} });
    expect(noQty.errors).toEqual({ quantity: "Enter how many" });
    expect(noItem.errors).toEqual({ itemId: "Choose a product" });
  });

  it("rejects zero, negative and non-numeric quantities", () => {
    for (const quantity of ["0", "-1", "abc", "0.0001"])
      expect(checkSold([sold({ itemId: SUGAR, quantity })], ITEMS)[0].errors.quantity).toBeTruthy();
  });

  it("shows stock before → after and the line amount", () => {
    const [c] = checkSold([sold({ itemId: SUGAR, quantity: "3" })], ITEMS);
    expect(c).toMatchObject({ stockBefore: 10, stockAfter: 7, amount: 138, oversell: false });
    expect(c.errors).toEqual({});
  });

  it("adds up two lines for the same item", () => {
    const checks = checkSold(
      [sold({ itemId: SUGAR, quantity: "4" }, "a"), sold({ itemId: SUGAR, quantity: "5" }, "b")],
      ITEMS,
    );
    expect(checks.map((c) => [c.stockBefore, c.stockAfter])).toEqual([
      [10, 6],
      [6, 1],
    ]);
    expect(soldTotal(checks)).toBe(414);
  });

  it("needs a tick to sell more than the recorded stock", () => {
    const [c] = checkSold([sold({ itemId: RICE, quantity: "3" })], ITEMS);
    expect(c).toMatchObject({ oversell: true, stockAfter: 0 });
    expect(c.errors.oversell).toBeTruthy();
    const [ok] = checkSold([sold({ itemId: RICE, quantity: "3", allowOversell: true })], ITEMS);
    expect(ok.errors).toEqual({});
  });
});

describe("toSoldEntries", () => {
  it("is null while a line has an error or every line is blank", () => {
    expect(toSoldEntries([sold({})], ITEMS)).toBeNull();
    expect(toSoldEntries([sold({ itemId: SUGAR })], ITEMS)).toBeNull();
  });

  it("drops blank lines and passes the schema", () => {
    const entries = toSoldEntries(
      [sold({ itemId: SUGAR, quantity: "2.5" }, "a"), sold({}, "b")],
      ITEMS,
    );
    expect(entries).toEqual([{ type: "sale", itemId: SUGAR, quantity: 2.5, allowOversell: false }]);
    expect(soldEntriesSchema.safeParse(entries).success).toBe(true);
  });

  it("ignores a leftover oversell tick once the line fits in stock", () => {
    const [e] = toSoldEntries(
      [sold({ itemId: SUGAR, quantity: "1", allowOversell: true })],
      ITEMS,
    )!;
    expect(e.allowOversell).toBe(false);
  });
});

describe("findItemByName", () => {
  it("matches exactly, ignoring case and outer spaces", () => {
    expect(findItemByName(ITEMS, "  sugar 1KG ")?.id).toBe(SUGAR);
    expect(findItemByName(ITEMS, "sugar")).toBeUndefined();
    expect(findItemByName(ITEMS, "  ")).toBeUndefined();
  });
});

describe("checkBought", () => {
  it("a known name restocks: no category needed, stock goes up", () => {
    const [c] = checkBought([bought({ name: "sugar 1kg", price: "46", quantity: "5" })], ITEMS);
    expect(c.match?.id).toBe(SUGAR);
    expect(c).toMatchObject({ stockBefore: 10, stockAfter: 15, errors: {} });
  });

  it("a new name needs a category, price and quantity", () => {
    const [c] = checkBought([bought({ name: "Maggi 70g" })], ITEMS);
    expect(c.match).toBeUndefined();
    expect(Object.keys(c.errors).sort()).toEqual(["categoryId", "price", "quantity"]);
  });

  it("flags the same new name on two lines", () => {
    const row = { name: "Maggi 70g", categoryId: CAT, price: "14", quantity: "20" };
    const [, second] = checkBought(
      [bought(row, "a"), bought({ ...row, name: "maggi 70G" }, "b")],
      ITEMS,
    );
    expect(second.errors.name).toBe("Already on another line");
  });

  it("rejects a negative or missing price", () => {
    const [neg, none] = checkBought(
      [
        bought({ name: "Sugar 1kg", price: "-1", quantity: "1" }, "a"),
        bought({ name: "Sugar 1kg", price: "", quantity: "1" }, "b"),
      ],
      ITEMS,
    );
    expect(neg.errors.price).toBeTruthy();
    expect(none.errors.price).toBe("Enter a price");
  });
});

describe("toBoughtEntries", () => {
  it("turns known names into restocks and new names into items", () => {
    const entries = toBoughtEntries(
      [
        bought({ name: "Sugar 1kg", price: "48", quantity: "5" }, "a"),
        bought({ name: " Maggi 70g ", categoryId: CAT, price: "14.499", quantity: "20" }, "b"),
        bought({}, "c"),
      ],
      ITEMS,
    );
    expect(entries).toEqual([
      { type: "restock", itemId: SUGAR, quantity: 5, price: 48 },
      {
        type: "create_item",
        name: "Maggi 70g",
        unit: "pcs",
        price: 14.5,
        quantity: 20,
        categoryId: CAT,
      },
    ]);
    expect(boughtEntriesSchema.safeParse(entries).success).toBe(true);
  });

  it("is null while any line is incomplete", () => {
    expect(
      toBoughtEntries([bought({ name: "Maggi 70g", price: "14", quantity: "2" })], ITEMS),
    ).toBeNull();
  });
});

describe("entry schemas (server side)", () => {
  it("reject bad ids, zero quantities and oversized batches", () => {
    const sale = { type: "sale", itemId: SUGAR, quantity: 1, allowOversell: false };
    expect(soldEntriesSchema.safeParse([{ ...sale, itemId: "1 or 1=1" }]).success).toBe(false);
    expect(soldEntriesSchema.safeParse([{ ...sale, quantity: 0 }]).success).toBe(false);
    expect(soldEntriesSchema.safeParse([]).success).toBe(false);
    expect(soldEntriesSchema.safeParse(Array(21).fill(sale)).success).toBe(false);
  });

  it("keep each tab to its own kinds of line", () => {
    const restock = { type: "restock", itemId: SUGAR, quantity: 1, price: 46 };
    expect(soldEntriesSchema.safeParse([restock]).success).toBe(false);
    expect(
      boughtEntriesSchema.safeParse([
        { type: "sale", itemId: SUGAR, quantity: 1, allowOversell: true },
      ]).success,
    ).toBe(false);
    expect(
      boughtEntriesSchema.safeParse([{ type: "update_threshold", itemId: SUGAR, threshold: 1 }])
        .success,
    ).toBe(false);
  });
});

describe("suggestItems", () => {
  const SHOP: EntryItem[] = [
    ...ITEMS,
    item({ id: "free", name: "Sugar Free Natura" }),
    item({ id: "brown", name: "Brown Sugar", lastBought: 1000 }),
    item({ id: "coke", name: "Coca Cola 750ml", lastBought: 4000 }),
    item({ id: "parle", name: "Parle-G 250g" }),
  ];
  const names = (q: string, limit?: number) => suggestItems(SHOP, q, limit).map((i) => i.name);

  it("puts names that start with the text first, then word starts, newest bought first", () => {
    expect(names("sug")).toEqual(["Sugar 1kg", "Sugar Free Natura", "Brown Sugar"]);
    expect(names("RICE")).toEqual(["Matta Rice 5kg"]);
    expect(names("g 2")).toEqual(["Parle-G 250g"]); // contains
  });

  it("falls back to fuzzy matches for typos and local names", () => {
    expect(names("sugr")).toContain("Sugar 1kg");
    expect(names("coke")).toEqual(["Coca Cola 750ml"]);
    expect(names("zz")).toEqual([]);
  });

  it("lists recently bought items for an empty box", () => {
    expect(names("  ")).toEqual(["Coca Cola 750ml", "Sugar 1kg", "Matta Rice 5kg", "Brown Sugar"]);
    expect(names("", 2)).toHaveLength(2);
  });

  it("doesn't suggest the item already typed in full", () => {
    expect(suggestItems(SHOP, "sugar 1KG").map((i) => i.id)).not.toContain(SUGAR);
  });
});

describe("withName", () => {
  it("a known name brings its category and price", () => {
    const r = withName(bought({}), "Sugar 1kg", ITEMS);
    expect(r).toMatchObject({ name: "Sugar 1kg", categoryId: CAT, price: "46", priceFrom: SUGAR });
  });

  it("keeps a price the owner typed", () => {
    const r = withName(bought({ price: "50" }), "sugar 1kg", ITEMS);
    expect(r.price).toBe("50");
    expect(r.priceFrom).toBeUndefined();
  });

  it("replaces a price that came from an earlier pick", () => {
    const first = withName(bought({}), "Sugar 1kg", ITEMS);
    expect(withName(first, "Matta Rice 5kg", ITEMS)).toMatchObject({
      price: "310",
      priceFrom: RICE,
    });
  });

  it("leaves other fields alone for a new name", () => {
    const r = withName(bought({ price: "14", categoryId: CAT }), "Maggi 70g", ITEMS);
    expect(r).toMatchObject({ name: "Maggi 70g", price: "14", categoryId: CAT });
  });
});
