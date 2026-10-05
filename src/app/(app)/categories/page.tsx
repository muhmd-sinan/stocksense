import { pageTitle } from "@/components/field";
import { Screen } from "@/components/screen";
import { listCategoriesWithCounts } from "@/lib/data/categories";
import { getCurrentShopId } from "@/lib/shop";
import { AddCategory, CategoryRow } from "./category-forms";

export default async function CategoriesPage() {
  const cats = await listCategoriesWithCounts(await getCurrentShopId());
  return (
    <Screen>
      <h1 className={pageTitle}>Categories</h1>
      <AddCategory />
      <ul className="divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-line bg-surface">
        {cats.map((c, n) => (
          <CategoryRow key={c.id} index={n} id={c.id} name={c.name} itemCount={c.itemCount} />
        ))}
      </ul>
    </Screen>
  );
}
