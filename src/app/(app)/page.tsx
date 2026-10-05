import { pageTitle } from "@/components/field";
import { Screen } from "@/components/screen";
import { listCategories } from "@/lib/data/categories";
import { getCurrentShopId } from "@/lib/shop";
import { EntryForm } from "./entry-form";

export default async function EntryPage() {
  const shopId = await getCurrentShopId();
  const categories = await listCategories(shopId);
  return (
    <Screen>
      <h1 className={pageTitle}>Entry</h1>
      <EntryForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </Screen>
  );
}
