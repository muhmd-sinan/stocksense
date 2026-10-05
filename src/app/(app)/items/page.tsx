import { MagnifyingGlassIcon, PackageIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { inputClass, key, pageTitle, stagger, tagClass, textLink } from "@/components/field";
import { Screen } from "@/components/screen";
import { listCategories } from "@/lib/data/categories";
import { listItems } from "@/lib/data/items";
import { formatINR, formatQty, toNum } from "@/lib/format";
import { getCurrentShopId } from "@/lib/shop";

/** Column widths shared by the ledger's header and its rows once it's wide enough */
const WIDE_COLS = "@min-[44rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem_10rem]";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = "", category = "" } = await searchParams;
  const shopId = await getCurrentShopId();
  const [categories, rows] = await Promise.all([
    listCategories(shopId),
    listItems(shopId, { q, categoryId: category }),
  ]);
  const filtered = Boolean(q || category);

  return (
    <Screen>
      <div className="flex items-center justify-between gap-3">
        <h1 className={pageTitle}>Items</h1>
        <Link href="/items/new" transitionTypes={["nav-forward"]} className={key("primary", "sm")}>
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          New item
        </Link>
      </div>

      {/* Plain GET form: works without JS, filters live in the URL */}
      <form role="search" className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">
            Search items
          </label>
          <MagnifyingGlassIcon
            aria-hidden
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-2"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search items"
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="flex gap-3">
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className={`${inputClass} flex-1 sm:w-48`}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={key("secondary")}>
            Filter
          </button>
        </div>
      </form>

      <p className="text-sm font-semibold text-ink-2" aria-live="polite">
        <span className="tabular-nums">{rows.length}</span> item{rows.length === 1 ? "" : "s"}
        {filtered && (
          <>
            {", "}
            <Link href="/items" className={textLink}>
              Clear filters
            </Link>
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="enter flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-line p-6">
          <PackageIcon aria-hidden weight="duotone" className="size-10 text-ink-2" />
          <p className="text-lg font-extrabold">{filtered ? "No items match." : "No items yet."}</p>
          <p className="text-ink-2">
            {filtered
              ? "Try another name or category."
              : "Add one with New item, or enter a purchase on Entry → Bought."}
          </p>
        </div>
      ) : (
        // One ledger, rows split by rules: no card per item. Narrow: name over "category, price",
        // stock on the right. Wide (by the ledger's own width): one table row per item.
        <div className="@container overflow-hidden rounded-xl border-2 border-line bg-surface">
          <div
            aria-hidden
            className={`stamp hidden border-b-2 border-line px-4 py-3 text-ink-2 @min-[44rem]:grid ${WIDE_COLS}`}
          >
            <span>Item</span>
            <span>Category</span>
            <span className="text-right">Price</span>
            <span className="text-right">Stock</span>
          </div>
          <ul className="divide-y-2 divide-line">
            {rows.map((i, n) => {
              const low = toNum(i.currentStock) <= toNum(i.lowStockThreshold);
              return (
                <li key={i.id} className="enter" style={stagger(n)}>
                  <Link
                    href={`/items/${i.id}`}
                    transitionTypes={["nav-forward"]}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3.5 transition-colors [grid-template-areas:'name_stock'_'meta_stock'] hover:bg-sunken focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus @min-[44rem]:[grid-template-areas:'name_cat_price_stock'] ${WIDE_COLS}`}
                  >
                    <p className="text-lg leading-snug font-bold break-words [grid-area:name]">
                      {i.name}
                    </p>
                    {/* contents on wide screens, so category and price become their own cells */}
                    <p className="self-start text-sm text-ink-2 [grid-area:meta] @min-[44rem]:contents">
                      <span className="break-words @min-[44rem]:text-base @min-[44rem]:font-semibold @min-[44rem]:[grid-area:cat]">
                        {i.categoryName}
                      </span>
                      <span className="@min-[44rem]:hidden">, </span>
                      <span className="tabular-nums @min-[44rem]:text-right @min-[44rem]:text-base @min-[44rem]:font-semibold @min-[44rem]:text-ink @min-[44rem]:[grid-area:price]">
                        {formatINR(i.price)}
                      </span>
                    </p>
                    <div className="flex flex-col items-end gap-1 [grid-area:stock]">
                      <p className="headline text-2xl whitespace-nowrap tabular-nums">
                        <span className={low ? "text-danger" : ""}>
                          {formatQty(i.currentStock)}
                        </span>{" "}
                        <span className="text-sm font-bold tracking-normal text-ink-2">
                          {i.unit}
                        </span>
                      </p>
                      {low && (
                        <span className={`${tagClass.base} ${tagClass.danger}`}>Low stock</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Screen>
  );
}
