import Link from "next/link";
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

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-950">Items</h1>
        <Link
          href="/items/new"
          className="flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900"
        >
          + New item
        </Link>
      </div>

      {/* Plain GET form: works without JS, filters live in the URL */}
      <form role="search" className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="q" className="sr-only">
          Search items
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search items"
          className="min-h-12 flex-1 rounded-lg border-2 border-slate-400 bg-white px-3 text-lg"
        />
        <label htmlFor="category" className="sr-only">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category}
          className="min-h-12 rounded-lg border-2 border-slate-400 bg-white px-3 text-lg"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-12 rounded-lg border-2 border-slate-800 bg-white px-4 font-semibold"
        >
          Filter
        </button>
      </form>

      <p className="text-sm text-slate-700" aria-live="polite">
        {rows.length} item{rows.length === 1 ? "" : "s"}
        {(q || category) && (
          <>
            {" · "}
            <Link href="/items" className="font-semibold text-emerald-800 underline">
              Clear filters
            </Link>
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center text-slate-700">
          No items found.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((i) => {
            const low = toNum(i.currentStock) <= toNum(i.lowStockThreshold);
            return (
              <li key={i.id}>
                <Link
                  href={`/items/${i.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border-2 border-slate-200 bg-white p-4 hover:border-emerald-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-950">{i.name}</p>
                    <p className="text-sm text-slate-700">
                      {i.categoryName} · {formatINR(i.price)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-bold ${low ? "text-red-800" : "text-slate-950"}`}>
                      {formatQty(i.currentStock)} {i.unit}
                    </p>
                    {low && (
                      <p className="rounded bg-red-100 px-2 text-sm font-semibold text-red-900">
                        Low stock
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
