"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCategory, deleteCategory, renameCategory } from "@/lib/data/categories";
import { DataError } from "@/lib/data/errors";
import type { FormState } from "@/lib/form-state";
import { getCurrentShopId } from "@/lib/shop";
import { categorySchema, uuidSchema } from "@/lib/validation";

function toState(e: unknown, values?: Record<string, string>): FormState {
  if (e instanceof DataError)
    return e.field
      ? { fieldErrors: { [e.field]: [e.message] }, values }
      : { error: e.message, values };
  throw e;
}

export async function addCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const shopId = await getCurrentShopId();
  const values = { name: String(fd.get("name") ?? "") };
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    await createCategory(shopId, parsed.data.name);
  } catch (e) {
    return toState(e, values);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function renameCategoryAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const shopId = await getCurrentShopId();
  const values = { name: String(fd.get("name") ?? "") };
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  if (!uuidSchema.safeParse(id).success) return { error: "Category not found" };
  try {
    await renameCategory(shopId, id, parsed.data.name);
  } catch (e) {
    return toState(e, values);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  const shopId = await getCurrentShopId();
  if (!uuidSchema.safeParse(id).success) return { error: "Category not found" };
  try {
    await deleteCategory(shopId, id);
  } catch (e) {
    return toState(e);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
