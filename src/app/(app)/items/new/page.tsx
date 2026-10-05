import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { pageTitle, textLink } from "@/components/field";
import { Screen } from "@/components/screen";
import { listCategories } from "@/lib/data/categories";
import { getCurrentShopId } from "@/lib/shop";
import { saveItemAction } from "../actions";
import { ItemForm } from "../item-form";

export default async function NewItemPage() {
  const categories = await listCategories(await getCurrentShopId());
  return (
    <Screen className="max-w-xl">
      <Link
        href="/items"
        transitionTypes={["nav-back"]}
        className={`${textLink} -my-2 inline-flex min-h-11 items-center gap-1.5 self-start`}
      >
        <ArrowLeftIcon aria-hidden weight="bold" className="size-4" />
        Items
      </Link>
      <h1 className={pageTitle}>New item</h1>
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
    </Screen>
  );
}
