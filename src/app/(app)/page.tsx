import { listCategories } from "@/lib/data/categories";
import { getCurrentShopId } from "@/lib/shop";
import { EntryForm } from "./entry-form";

export default async function EntryPage() {
  const shopId = await getCurrentShopId();
  const categories = await listCategories(shopId);
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-950">Entry</h1>
      <EntryForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
