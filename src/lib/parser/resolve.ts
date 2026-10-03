// Parsed actions → drafts, matching free-text names against the shop's items.
// Anything uncertain is left open (itemId null / quantity null) so the card asks.

import { matchCategory, matchItem } from "./match";
import type { CategoryOption, Draft, ItemOption } from "./draft";
import type { ParsedAction } from "./schema";

export function resolveActions(
  actions: ParsedAction[],
  items: ItemOption[],
  categories: CategoryOption[],
): Draft[] {
  return actions.map((a, i): Draft => {
    const key = `d${i}`;
    if (a.type === "create_item") {
      return {
        key,
        text: a.item,
        type: "create_item",
        name: a.item,
        unit: a.unit ?? "pcs",
        price: a.price,
        quantity: a.quantity ?? 0,
        categoryId: matchCategory(a.category, categories)?.id ?? null,
      };
    }
    const m = matchItem(a.item, items);
    const itemId = m.kind === "matched" ? m.item.id : null;
    const candidates = m.kind === "matched" ? [m.item.id] : m.candidates.map((c) => c.item.id);
    if (a.type === "update_threshold")
      return { key, text: a.item, type: a.type, itemId, candidates, threshold: a.threshold };
    return {
      key,
      text: a.item,
      type: a.type,
      itemId,
      candidates,
      quantity: a.quantity,
      allowOversell: false,
    };
  });
}
