"use server";

import { revalidatePath } from "next/cache";
import { listCategories } from "@/lib/data/categories";
import { applyEntries, type AppliedLine } from "@/lib/data/entries";
import { DataError } from "@/lib/data/errors";
import { listItemOptions } from "@/lib/data/items";
import { parseEntry, type ParseSource } from "@/lib/parser";
import type { Draft, ItemOption } from "@/lib/parser/draft";
import { MAX_ENTRY_CHARS } from "@/lib/parser/prompt";
import { resolveActions } from "@/lib/parser/resolve";
import { getCurrentShopId } from "@/lib/shop";
import { entriesSchema } from "@/lib/validation";

export type ParseResponse =
  | { ok: true; drafts: Draft[]; items: ItemOption[]; source: ParseSource; notice?: string }
  | { ok: false; error: string };

/** Reads the note and proposes drafts. Read-only: nothing is saved here. */
export async function parseEntryAction(text: string): Promise<ParseResponse> {
  const shopId = await getCurrentShopId();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return { ok: false, error: "Type what you sold or received first" };
  if (trimmed.length > MAX_ENTRY_CHARS)
    return { ok: false, error: `Keep it under ${MAX_ENTRY_CHARS} characters` };

  const [items, categories] = await Promise.all([listItemOptions(shopId), listCategories(shopId)]);
  const outcome = await parseEntry(
    trimmed,
    items.map((i) => i.name),
  );
  if (!outcome.actions.length)
    return {
      ok: false,
      error: 'Couldn\'t find any sales or stock in that. Try e.g. "sold 2 matta rice, 1 sugar".',
    };
  return {
    ok: true,
    drafts: resolveActions(outcome.actions, items, categories),
    items,
    source: outcome.source,
    notice: outcome.notice,
  };
}

export type ApplyResponse = { ok: true; lines: AppliedLine[] } | { ok: false; error: string };

/** Saves confirmed lines atomically. Ids are re-checked against the session's shop. */
export async function applyEntryAction(entries: unknown, rawText: string): Promise<ApplyResponse> {
  const shopId = await getCurrentShopId();
  const parsed = entriesSchema.safeParse(entries);
  if (!parsed.success)
    return { ok: false, error: "Some lines are incomplete. Check them and try again." };
  try {
    const lines = await applyEntries(shopId, parsed.data, String(rawText ?? ""));
    revalidatePath("/", "layout");
    return { ok: true, lines };
  } catch (e) {
    if (e instanceof DataError) return { ok: false, error: e.message };
    throw e;
  }
}
