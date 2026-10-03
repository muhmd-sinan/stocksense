// Drafts are the editable, not-yet-saved lines shown on the confirmation card.
// Pure and client-safe: the entry form uses these helpers live, the server re-checks on save.

import { round3 } from "@/lib/format";

export type ItemOption = {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  threshold: number;
};
export type CategoryOption = { id: string; name: string };

type Base = { key: string; text: string };
export type StockDraft = Base & {
  type: "sale" | "restock";
  itemId: string | null;
  candidates: string[]; // item ids suggested by the matcher, best first
  quantity: number | null;
  allowOversell: boolean;
};
export type ThresholdDraft = Base & {
  type: "update_threshold";
  itemId: string | null;
  candidates: string[];
  threshold: number | null;
};
export type CreateDraft = Base & {
  type: "create_item";
  name: string;
  unit: string;
  price: number | null;
  quantity: number;
  categoryId: string | null;
};
export type Draft = StockDraft | ThresholdDraft | CreateDraft;

export type LineCheck = {
  questions: string[]; // must be answered before saving
  warning?: string; // shown but doesn't block (e.g. accepted oversell)
  oversell: boolean;
  stockBefore?: number;
  stockAfter?: number;
};

const positive = (n: number | null): n is number => n != null && Number.isFinite(n) && n > 0;

/** Checks every line in order, tracking stock so two lines for one item add up correctly. */
export function checkDrafts(drafts: Draft[], items: ItemOption[]): LineCheck[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const stock = new Map(items.map((i) => [i.id, i.stock]));
  const newNames = new Set<string>();

  return drafts.map((d): LineCheck => {
    const questions: string[] = [];

    if (d.type === "create_item") {
      const name = d.name.trim().toLowerCase();
      if (!name) questions.push("What is the new item called?");
      else if (items.some((i) => i.name.toLowerCase() === name) || newNames.has(name))
        questions.push(
          `You already have "${d.name.trim()}". Change the name or restock it instead.`,
        );
      if (d.price == null || !Number.isFinite(d.price) || d.price < 0)
        questions.push("What is the price?");
      if (!d.categoryId) questions.push("Which category?");
      if (!d.unit.trim()) questions.push("What unit do you count it in?");
      if (!Number.isFinite(d.quantity) || d.quantity < 0)
        questions.push("Opening stock can't be negative");
      newNames.add(name);
      return { questions, oversell: false };
    }

    const item = d.itemId ? byId.get(d.itemId) : undefined;
    if (!item)
      questions.push(
        d.candidates.length
          ? `Which item did you mean by "${d.text}"?`
          : `No item matches "${d.text}". Pick one or add it on the Items page.`,
      );

    if (d.type === "update_threshold") {
      if (d.threshold == null || !Number.isFinite(d.threshold) || d.threshold < 0)
        questions.push("What should the alert level be?");
      return { questions, oversell: false };
    }

    if (!positive(d.quantity)) questions.push("How many?");
    if (!item || !positive(d.quantity)) return { questions, oversell: false };

    const before = stock.get(item.id)!;
    const qty = round3(d.quantity);
    if (d.type === "restock") {
      stock.set(item.id, round3(before + qty));
      return { questions, oversell: false, stockBefore: before, stockAfter: round3(before + qty) };
    }
    if (qty <= before) {
      stock.set(item.id, round3(before - qty));
      return { questions, oversell: false, stockBefore: before, stockAfter: round3(before - qty) };
    }
    // Selling more than recorded: the stock count must be wrong. Needs an explicit yes.
    const warning = `Only ${before} ${item.unit} in stock. Saving will correct the stock count and leave 0.`;
    if (!d.allowOversell) questions.push("Confirm you sold more than the recorded stock");
    stock.set(item.id, 0);
    return { questions, warning, oversell: true, stockBefore: before, stockAfter: 0 };
  });
}

export type EntryInput =
  | { type: "sale"; itemId: string; quantity: number; allowOversell: boolean }
  | { type: "restock"; itemId: string; quantity: number }
  | { type: "update_threshold"; itemId: string; threshold: number }
  | {
      type: "create_item";
      name: string;
      unit: string;
      price: number;
      quantity: number;
      categoryId: string;
    };

/** Converts fully-answered drafts into what the server applies. Returns null if any line is open. */
export function toEntries(drafts: Draft[], items: ItemOption[]): EntryInput[] | null {
  const checks = checkDrafts(drafts, items);
  if (!drafts.length || checks.some((c) => c.questions.length)) return null;
  return drafts.map((d): EntryInput => {
    switch (d.type) {
      case "sale":
        return {
          type: "sale",
          itemId: d.itemId!,
          quantity: d.quantity!,
          allowOversell: d.allowOversell,
        };
      case "restock":
        return { type: "restock", itemId: d.itemId!, quantity: d.quantity! };
      case "update_threshold":
        return { type: "update_threshold", itemId: d.itemId!, threshold: d.threshold! };
      case "create_item":
        return {
          type: "create_item",
          name: d.name.trim(),
          unit: d.unit.trim(),
          price: d.price!,
          quantity: d.quantity,
          categoryId: d.categoryId!,
        };
    }
  });
}
