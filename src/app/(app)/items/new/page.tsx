import Link from "next/link";
import { listCategories } from "@/lib/data/categories";
import { getCurrentShopId } from "@/lib/shop";
import { saveItemAction } from "../actions";
import { ItemForm } from "../item-form";

export default async function NewItemPage() {
  const categories = await listCategories(await getCurrentShopId());
  return (
    <>
      <Link href="/items" className="font-semibold text-emerald-800 underline underline-offset-2">
        ← Items
      </Link>
      <h1 className="text-2xl font-bold text-slate-950">New item</h1>
      <ItemForm
        action={saveItemAction.bind(null, null)}
        categories={categories}
        submitLabel="Add item"
        initial={{
          name: "",
          categoryId: "",
          unit: "pcs",
          price: "",
          currentStock: "0",
          lowStockThreshold: "0",
        }}
      />
    </>
  );
}
