import { z } from "zod";
import { MAX_PRICE, MAX_QTY, MAX_ROWS } from "@/lib/entry-rows";

/** Form number field: empty → "required" error instead of silently becoming 0 */
function amount(label: string, max: number) {
  return z.preprocess(
    // "" → undefined (missing), "abc" → NaN (not a number), numbers pass through
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim())) : v),
    z
      .number({
        error: (iss) => (iss.input === undefined ? `Enter ${label}` : `Enter ${label} as a number`),
      })
      .min(0, `${label[0].toUpperCase()}${label.slice(1)} can't be negative`)
      .max(max, `That ${label} is too large`),
  );
}

export const itemSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80, "Keep the name under 80 characters"),
  categoryId: z.uuid("Pick a category"),
  unit: z.string().trim().min(1, "Enter a unit, e.g. pack, kg, bottle").max(20),
  price: amount("a price", 9_999_999),
  currentStock: amount("the stock", 999_999_999),
  lowStockThreshold: amount("an alert level", 999_999_999),
});
export type ItemInput = z.infer<typeof itemSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(40, "Keep it under 40 characters"),
});

export const uuidSchema = z.uuid();

// What the Entry page's Sold and Bought tabs send on Save. Re-validated on the server; ids are
// re-checked against the session's shop when applied.
const qty = z.number().positive("Quantity must be more than 0").max(MAX_QTY);
const price = z.number().min(0).max(MAX_PRICE);

export const soldEntriesSchema = z
  .array(
    z.object({
      type: z.literal("sale"),
      itemId: z.uuid(),
      quantity: qty,
      allowOversell: z.boolean(),
    }),
  )
  .min(1)
  .max(MAX_ROWS);

export const boughtEntriesSchema = z
  .array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("restock"), itemId: z.uuid(), quantity: qty, price }),
      z.object({
        type: z.literal("create_item"),
        name: z.string().trim().min(1).max(80),
        unit: z.string().trim().min(1).max(20),
        price,
        quantity: qty,
        categoryId: z.uuid(),
      }),
    ]),
  )
  .min(1)
  .max(MAX_ROWS);
