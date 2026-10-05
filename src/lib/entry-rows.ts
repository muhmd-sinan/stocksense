// Rows on the Entry page's Sold and Bought tabs. Pure and client-safe: the form checks rows
// live, and the server re-validates what it receives (see soldEntriesSchema / boughtEntriesSchema).

import { round3 } from "@/lib/format";
import { scoreName } from "@/lib/parser/match";

export const MAX_ROWS = 20;
export const MAX_QTY = 999_999;
export const MAX_PRICE = 9_999_999;
export const NEW_ITEM_UNIT = "pcs";

export type EntryItem = {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  categoryId: string;
  lastBought: number | null; // epoch ms of the latest restock, for "bought recently" suggestions
};
export type CategoryOption = { id: string; name: string };

// Inputs stay strings so partial typing like "1." isn't rewritten
export type SoldRow = {
  key: string;
  categoryId: string; // "" = all categories (only filters the product list)
  itemId: string;
  quantity: string;
  allowOversell: boolean;
};
export type BoughtRow = {
  key: string;
  name: string;
  categoryId: string;
  price: string;
  quantity: string;
  priceFrom?: string; // item id the price was filled from; cleared once the owner edits the price
};

export type SoldErrors = Partial<Record<"itemId" | "quantity" | "oversell", string>>;
export type BoughtErrors = Partial<Record<"name" | "categoryId" | "price" | "quantity", string>>;

export type SoldCheck = {
  blank: boolean;
  errors: SoldErrors;
  item?: EntryItem;
  stockBefore?: number;
  stockAfter?: number;
  oversell: boolean;
  amount: number; // quantity × price, 0 until both are known
};
export type BoughtCheck = {
  blank: boolean;
  errors: BoughtErrors;
  match?: EntryItem; // set when the name is an existing item: this line restocks it
  stockBefore?: number;
  stockAfter?: number;
};

/** "" → null, "abc" → NaN, " 2 " → 2 */
export function parseNum(v: string): number | null {
  const t = v.trim();
  return t === "" ? null : Number(t);
}

function quantityError(v: string): string | undefined {
  const n = parseNum(v);
  if (n == null) return "Enter how many";
  if (!Number.isFinite(n)) return "Enter a number";
  if (round3(n) <= 0) return "Must be more than 0";
  if (n > MAX_QTY) return "That's too many";
  return undefined;
}

function priceError(v: string): string | undefined {
  const n = parseNum(v);
  if (n == null) return "Enter a price";
  if (!Number.isFinite(n)) return "Enter a number";
  if (n < 0) return "Can't be negative";
  if (n > MAX_PRICE) return "That price is too large";
  return undefined;
}

const isBlankSold = (r: SoldRow) => !r.itemId && !r.quantity.trim();
const isBlankBought = (r: BoughtRow) => !r.name.trim() && !r.price.trim() && !r.quantity.trim();

/** Checks sold rows in order, tracking stock so two lines for one item add up. */
export function checkSold(rows: SoldRow[], items: EntryItem[]): SoldCheck[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const stock = new Map(items.map((i) => [i.id, i.stock]));

  return rows.map((r): SoldCheck => {
    if (isBlankSold(r)) return { blank: true, errors: {}, oversell: false, amount: 0 };
    const errors: SoldErrors = {};
    const item = byId.get(r.itemId);
    if (!item) errors.itemId = "Choose a product";
    const qErr = quantityError(r.quantity);
    if (qErr) errors.quantity = qErr;
    if (!item || qErr) return { blank: false, errors, item, oversell: false, amount: 0 };

    const qty = round3(parseNum(r.quantity)!);
    const before = stock.get(item.id)!;
    const amount = Math.round(qty * item.price * 100) / 100;
    if (qty <= before) {
      stock.set(item.id, round3(before - qty));
      return {
        blank: false,
        errors,
        item,
        stockBefore: before,
        stockAfter: round3(before - qty),
        oversell: false,
        amount,
      };
    }
    // Selling more than recorded means the count was wrong. Needs an explicit yes.
    if (!r.allowOversell) errors.oversell = "Tick the box to confirm";
    stock.set(item.id, 0);
    return {
      blank: false,
      errors,
      item,
      stockBefore: before,
      stockAfter: 0,
      oversell: true,
      amount,
    };
  });
}

/** Exact, case-insensitive name match (the same rule as the DB's unique index) */
export function findItemByName(items: EntryItem[], name: string): EntryItem | undefined {
  const n = name.trim().toLowerCase();
  return n ? items.find((i) => i.name.toLowerCase() === n) : undefined;
}

export const MAX_SUGGESTIONS = 5;

/**
 * Items to suggest while a name is typed on Bought. Tiers: the name starts with the text, then a
 * word in it does, then it contains the text, then a fuzzy match (typos, local names). Within a
 * tier the most recently bought come first. An empty box lists recently bought items.
 */
export function suggestItems(
  items: EntryItem[],
  text: string,
  limit = MAX_SUGGESTIONS,
): EntryItem[] {
  const q = text.trim().toLowerCase();
  const recent = (a: EntryItem, b: EntryItem) =>
    (b.lastBought ?? 0) - (a.lastBought ?? 0) || a.name.localeCompare(b.name);
  if (!q)
    return items
      .filter((i) => i.lastBought != null)
      .sort(recent)
      .slice(0, limit);

  const tier = (i: EntryItem): number => {
    const n = i.name.toLowerCase();
    if (n === q) return -1; // already typed in full: nothing to suggest
    if (n.startsWith(q)) return 0;
    if (n.split(/[\s\-/(]+/).some((w) => w.startsWith(q))) return 1;
    if (n.includes(q)) return 2;
    return q.length >= 3 && scoreName(q, i.name) >= 0.5 ? 3 : -1;
  };
  return items
    .map((item) => ({ item, t: tier(item) }))
    .filter((s) => s.t >= 0)
    .sort((a, b) => a.t - b.t || recent(a.item, b.item))
    .slice(0, limit)
    .map((s) => s.item);
}

/**
 * New name for a bought line. A known name brings its category and price. A price filled from an
 * item is replaced by the next item's; a price the owner typed is kept.
 */
export function withName(row: BoughtRow, name: string, items: EntryItem[]): BoughtRow {
  const match = findItemByName(items, name);
  if (!match) return { ...row, name };
  const replacePrice = row.price.trim() === "" || row.priceFrom != null;
  return {
    ...row,
    name,
    categoryId: match.categoryId,
    ...(replacePrice && { price: String(match.price), priceFrom: match.id }),
  };
}

/** Checks bought rows. A known name restocks that item; a new name creates one. */
export function checkBought(rows: BoughtRow[], items: EntryItem[]): BoughtCheck[] {
  const stock = new Map(items.map((i) => [i.id, i.stock]));
  const newNames = new Set<string>();

  return rows.map((r): BoughtCheck => {
    if (isBlankBought(r)) return { blank: true, errors: {} };
    const errors: BoughtErrors = {};
    const name = r.name.trim();
    const match = findItemByName(items, name);

    if (!name) errors.name = "Enter a name";
    else if (name.length > 80) errors.name = "Keep it under 80 characters";
    else if (!match) {
      if (newNames.has(name.toLowerCase())) errors.name = "Already on another line";
      newNames.add(name.toLowerCase());
    }
    if (!match && !r.categoryId) errors.categoryId = "Choose a category";
    const pErr = priceError(r.price);
    if (pErr) errors.price = pErr;
    const qErr = quantityError(r.quantity);
    if (qErr) errors.quantity = qErr;
    if (qErr || !name) return { blank: false, errors, match };

    const qty = round3(parseNum(r.quantity)!);
    const before = match ? stock.get(match.id)! : 0;
    if (match) stock.set(match.id, round3(before + qty));
    return { blank: false, errors, match, stockBefore: before, stockAfter: round3(before + qty) };
  });
}

export const hasErrors = (c: { errors: object }) => Object.keys(c.errors).length > 0;

export type SoldEntry = { type: "sale"; itemId: string; quantity: number; allowOversell: boolean };
export type BoughtEntry =
  | { type: "restock"; itemId: string; quantity: number; price: number }
  | {
      type: "create_item";
      name: string;
      unit: string;
      price: number;
      quantity: number;
      categoryId: string;
    };

/** What Save sends. Null while any line has an error or every line is blank. */
export function toSoldEntries(rows: SoldRow[], items: EntryItem[]): SoldEntry[] | null {
  const checks = checkSold(rows, items);
  if (checks.some(hasErrors) || checks.every((c) => c.blank)) return null;
  return rows.flatMap((r, i): SoldEntry[] =>
    checks[i].blank
      ? []
      : [
          {
            type: "sale",
            itemId: r.itemId,
            quantity: round3(parseNum(r.quantity)!),
            // Only honoured while the line really oversells (the tick can outlive a quantity edit)
            allowOversell: checks[i].oversell && r.allowOversell,
          },
        ],
  );
}

export function toBoughtEntries(rows: BoughtRow[], items: EntryItem[]): BoughtEntry[] | null {
  const checks = checkBought(rows, items);
  if (checks.some(hasErrors) || checks.every((c) => c.blank)) return null;
  return rows.flatMap((r, i): BoughtEntry[] => {
    if (checks[i].blank) return [];
    const quantity = round3(parseNum(r.quantity)!);
    const price = Math.round(parseNum(r.price)! * 100) / 100;
    const match = checks[i].match;
    return [
      match
        ? { type: "restock", itemId: match.id, quantity, price }
        : {
            type: "create_item",
            name: r.name.trim(),
            unit: NEW_ITEM_UNIT,
            price,
            quantity,
            categoryId: r.categoryId,
          },
    ];
  });
}

/** Sum of line amounts, to the paisa */
export function soldTotal(checks: SoldCheck[]): number {
  return Math.round(checks.reduce((s, c) => s + c.amount, 0) * 100) / 100;
}

export const filledCount = (checks: { blank: boolean }[]) => checks.filter((c) => !c.blank).length;

let seq = 0;
/** Keys for rows added in the browser. The first row of each tab uses a fixed key (no SSR mismatch). */
export const nextKey = () => `r${++seq}`;

export const emptySold = (key: string): SoldRow => ({
  key,
  categoryId: "",
  itemId: "",
  quantity: "",
  allowOversell: false,
});
export const emptyBought = (key: string): BoughtRow => ({
  key,
  name: "",
  categoryId: "",
  price: "",
  quantity: "",
});
