import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategories } from "@/lib/data/categories";
import { getItem } from "@/lib/data/items";
import { formatQty, toNum } from "@/lib/format";
import { getCurrentShopId } from "@/lib/shop";
import { deleteItemAction, saveItemAction } from "../actions";
import { DeleteItem } from "./delete-item";
import { ItemForm } from "../item-form";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shopId = await getCurrentShopId();
  const [item, categories] = await Promise.all([getItem(shopId, id), listCategories(shopId)]);
  if (!item) notFound();

  return (
    <>
      <Link href="/items" className="font-semibold text-emerald-800 underline underline-offset-2">
        ← Items
      </Link>
      <h1 className="text-2xl font-bold text-slate-950">Edit {item.name}</h1>
      <ItemForm
        action={saveItemAction.bind(null, item.id)}
        categories={categories}
        submitLabel="Save changes"
        initial={{
          name: item.name,
          categoryId: item.categoryId,
          unit: item.unit,
          price: String(toNum(item.price)),
          currentStock: formatQty(item.currentStock),
          lowStockThreshold: formatQty(item.lowStockThreshold),
        }}
      />
      <p className="text-sm text-slate-700">
        Changing stock here records a correction in the item&apos;s history.
      </p>
      <DeleteItem name={item.name} action={deleteItemAction.bind(null, item.id)} />
    </>
  );
}
