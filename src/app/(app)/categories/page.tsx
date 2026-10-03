import { listCategoriesWithCounts } from "@/lib/data/categories";
import { getCurrentShopId } from "@/lib/shop";
import { AddCategory, CategoryRow } from "./category-forms";

export default async function CategoriesPage() {
  const cats = await listCategoriesWithCounts(await getCurrentShopId());
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-950">Categories</h1>
      <AddCategory />
      <ul className="flex flex-col gap-3">
        {cats.map((c) => (
          <CategoryRow key={c.id} id={c.id} name={c.name} itemCount={c.itemCount} />
        ))}
      </ul>
    </>
  );
}
