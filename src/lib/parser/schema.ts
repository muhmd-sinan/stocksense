import { z } from "zod";

// What a parser (LLM or rules) may propose. Nothing here touches the database;
// item names are free text that the resolver matches against the shop's items.

/** Lenient number: "2" → 2, missing/invalid/non-positive → null so the UI asks instead of failing */
const optionalQty = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : (v ?? null)),
  z.number().positive().max(999_999).nullable().catch(null),
);
const optionalAmount = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : (v ?? null)),
  z.number().min(0).max(9_999_999).nullable().catch(null),
);
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null),
    z.string().nullable(),
  );
const itemName = z.string().trim().min(1).max(120);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sale"), item: itemName, quantity: optionalQty }),
  z.object({ type: z.literal("restock"), item: itemName, quantity: optionalQty }),
  z.object({
    type: z.literal("create_item"),
    item: itemName,
    quantity: optionalQty,
    unit: optionalText(20),
    price: optionalAmount,
    category: optionalText(40),
  }),
  z.object({ type: z.literal("update_threshold"), item: itemName, threshold: optionalAmount }),
]);
export type ParsedAction = z.infer<typeof actionSchema>;

export const parseResultSchema = z.object({ actions: z.array(actionSchema).max(20) });
