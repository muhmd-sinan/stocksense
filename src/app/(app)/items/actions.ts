"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createItem, softDeleteItem, updateItem } from "@/lib/data/items";
import { DataError } from "@/lib/data/errors";
import { formValues, type FormState } from "@/lib/form-state";
import { getCurrentShopId } from "@/lib/shop";
import { itemSchema } from "@/lib/validation";

const FIELDS = [
  "name",
  "categoryId",
  "unit",
  "price",
  "currentStock",
  "lowStockThreshold",
] as const;

/** itemId is bound on the server component; ownership is re-checked against the session's shop. */
export async function saveItemAction(
  itemId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const shopId = await getCurrentShopId();
  const values = formValues(formData, FIELDS);
  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    if (itemId) await updateItem(shopId, itemId, parsed.data);
    else await createItem(shopId, parsed.data);
  } catch (e) {
    if (e instanceof DataError)
      return e.field
        ? { fieldErrors: { [e.field]: [e.message] }, values }
        : { error: e.message, values };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/items");
}

export async function deleteItemAction(itemId: string): Promise<FormState> {
  const shopId = await getCurrentShopId();
  try {
    await softDeleteItem(shopId, itemId);
  } catch (e) {
    if (e instanceof DataError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/items");
}
