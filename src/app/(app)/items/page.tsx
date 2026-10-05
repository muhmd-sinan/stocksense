import { MagnifyingGlassIcon, PackageIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { inputClass, key, pageTitle, stagger, tagClass, textLink } from "@/components/field";
import { Screen } from "@/components/screen";
import { listCategories } from "@/lib/data/categories";
import { listItems } from "@/lib/data/items";
import { formatINR, formatQty, toNum } from "@/lib/format";
import { getCurrentShopId } from "@/lib/shop";

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
              : "Add one with New item, or type “new item Maggi 70g price 14 stock 20” on Entry."}
          </p>
        </div>
      ) : (
        // One ledger, rows split by rules: no card per item
        <ul className="divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-line bg-surface">
          {rows.map((i, n) => {
            const low = toNum(i.currentStock) <= toNum(i.lowStockThreshold);
            return (
              <li key={i.id} className="enter" style={stagger(n)}>
                <Link
                  href={`/items/${i.id}`}
                  transitionTypes={["nav-forward"]}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-sunken focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{i.name}</p>
                    <p className="text-sm text-ink-2">
                      {i.categoryName}, {formatINR(i.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="headline text-2xl tabular-nums">
                      <span className={low ? "text-danger" : ""}>{formatQty(i.currentStock)}</span>{" "}
                      <span className="text-sm font-bold tracking-normal text-ink-2">{i.unit}</span>
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
      )}
    </Screen>
  );
}
