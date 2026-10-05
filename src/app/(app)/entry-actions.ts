"use server";

import { revalidatePath } from "next/cache";
import { applyEntries, type AppliedLine } from "@/lib/data/entries";
import { DataError } from "@/lib/data/errors";
import type { EntryInput } from "@/lib/parser/draft";
import { getCurrentShopId } from "@/lib/shop";
import { boughtEntriesSchema, soldEntriesSchema } from "@/lib/validation";

export type SaveResponse = { ok: true; lines: AppliedLine[] } | { ok: false; error: string };

const INCOMPLETE: SaveResponse = {
  ok: false,
  error: "Some lines are incomplete. Check them and try again.",
};

/**
 * Saves every line in one DB transaction: all lines save or none do. The date is the
 * transaction's created_at, set by the database. Ids are re-checked against the session's shop.
 */
async function apply(shopId: string, entries: EntryInput[], note: string): Promise<SaveResponse> {
  try {
    const lines = await applyEntries(shopId, entries, note);
    revalidatePath("/", "layout");
    return { ok: true, lines };
  } catch (e) {
    if (e instanceof DataError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveSoldAction(entries: unknown): Promise<SaveResponse> {
  const shopId = await getCurrentShopId();
  const parsed = soldEntriesSchema.safeParse(entries);
  if (!parsed.success) return INCOMPLETE;
  return apply(shopId, parsed.data, "Sold on Entry page");
}

export async function saveBoughtAction(entries: unknown): Promise<SaveResponse> {
  const shopId = await getCurrentShopId();
  const parsed = boughtEntriesSchema.safeParse(entries);
  if (!parsed.success) return INCOMPLETE;
  return apply(shopId, parsed.data, "Bought on Entry page");
}
