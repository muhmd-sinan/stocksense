import Link from "next/link";
import { getLowStock } from "@/lib/data/alerts";
import { listCategories } from "@/lib/data/categories";
import { getTodaySummary, salesByCategory, salesByDay, topItems } from "@/lib/data/insights";
import { formatINR, formatQty } from "@/lib/format";
import {
  dayKeys,
  fillDays,
  formatDayKey,
  parseRange,
  RANGES,
  TOP_ITEMS_DAYS,
} from "@/lib/insights";
import { getCurrentShopId } from "@/lib/shop";
import { SalesByCategoryChart, SalesOverTimeChart } from "./charts";

const card = "rounded-lg border-2 border-slate-200 bg-white p-4";
const h2 = "text-lg font-bold text-slate-950";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; category?: string }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const shopId = await getCurrentShopId();
  const categories = await listCategories(shopId);
  // Only a category of this shop counts; anything else means "all"
  const categoryId = categories.some((c) => c.id === params.category) ? params.category! : null;
  const now = new Date();

  const [today, byDay, byCategory, top, low] = await Promise.all([
    getTodaySummary(shopId, categoryId, now),
    salesByDay(shopId, range, categoryId, now),
    salesByCategory(shopId, range, categoryId, now),
    topItems(shopId, categoryId, now),
    getLowStock(shopId),
  ]);
  const days = fillDays(byDay, dayKeys(now, range));
  const lowHere = low.filter((s) => !categoryId || s.categoryId === categoryId);
  const rangeRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const categoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-950">Insights</h1>

      <form className="flex flex-col gap-2 sm:flex-row" aria-label="Filters">
        <label htmlFor="range" className="sr-only">
          Period
        </label>
        <select
          id="range"
          name="range"
          defaultValue={String(range)}
          className="min-h-12 rounded-lg border-2 border-slate-400 bg-white px-3 text-lg"
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>
              Last {r} days
            </option>
          ))}
        </select>
        <label htmlFor="category" className="sr-only">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={categoryId ?? ""}
          className="min-h-12 flex-1 rounded-lg border-2 border-slate-400 bg-white px-3 text-lg"
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
          Apply
        </button>
      </form>
      {categoryName && (
        <p className="text-sm text-slate-700">
          Showing {categoryName} only.{" "}
          <Link
            href={`/insights?range=${range}`}
            className="font-semibold text-emerald-800 underline"
          >
            Show all
          </Link>
        </p>
      )}

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="sr-only">
          Today
        </h2>
        <dl className="grid grid-cols-3 gap-2">
          <div className={card}>
            <dt className="text-sm text-slate-700">Sales today</dt>
            <dd className="text-2xl font-bold text-slate-950">{today.sales}</dd>
          </div>
          <div className={card}>
            <dt className="text-sm text-slate-700">Revenue today</dt>
            <dd className="text-2xl font-bold text-slate-950">{formatINR(today.revenue)}</dd>
          </div>
          <div className={`${card} relative hover:border-red-700`}>
            <dt className="text-sm text-slate-700">
              {/* Stretched link: the whole card opens Alerts */}
              <Link href="/alerts" className="after:absolute after:inset-0">
                Low stock
              </Link>
            </dt>
            <dd
              className={`text-2xl font-bold ${lowHere.length ? "text-red-800" : "text-slate-950"}`}
            >
              {lowHere.length}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="time-heading" className={card}>
        <h2 id="time-heading" className={h2}>
          Revenue, last {range} days
        </h2>
        <p className="text-slate-800">Total {formatINR(rangeRevenue)}</p>
        <SalesOverTimeChart data={days} />
        <table className="sr-only">
          <caption>Revenue and units sold per day</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Revenue</th>
              <th scope="col">Units</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day}>
                <th scope="row">{formatDayKey(d.day)}</th>
                <td>{formatINR(d.revenue)}</td>
                <td>{formatQty(d.units)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="cat-heading" className={card}>
        <h2 id="cat-heading" className={h2}>
          Revenue by category, last {range} days
        </h2>
        {byCategory.length ? (
          <>
            <SalesByCategoryChart data={byCategory} />
            <table className="sr-only">
              <caption>Revenue by category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">Units</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.id}>
                    <th scope="row">{c.name}</th>
                    <td>{formatINR(c.revenue)}</td>
                    <td>{formatQty(c.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-slate-800">No sales in this period.</p>
        )}
      </section>

      <section aria-labelledby="top-heading" className={card}>
        <h2 id="top-heading" className={h2}>
          Top 5 items, last {TOP_ITEMS_DAYS} days
        </h2>
        {top.length ? (
          <ol className="mt-2 flex flex-col divide-y divide-slate-200">
            {top.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-slate-950">
                  <span className="font-bold">{i + 1}.</span> {t.name}
                </span>
                <span className="shrink-0 text-right text-slate-800">
                  {formatQty(t.units)} {t.unit} · {formatINR(t.revenue)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-slate-800">No sales this week.</p>
        )}
      </section>

      <section aria-labelledby="low-heading" className={card}>
        <h2 id="low-heading" className={h2}>
          Running low
        </h2>
        {lowHere.length ? (
          <ul className="mt-2 flex flex-col divide-y divide-slate-200">
            {lowHere.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/items/${s.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline"
                >
                  <span className="min-w-0 truncate text-slate-950">{s.name}</span>
                  <span className="shrink-0 font-semibold text-red-800">
                    {s.stock <= 0
                      ? "Out of stock"
                      : s.forecast.daysLeft == null
                        ? `${formatQty(s.stock)} ${s.unit} left`
                        : s.forecast.daysLeft < 1
                          ? "Under 1 day left"
                          : `~${Math.floor(s.forecast.daysLeft)} ${Math.floor(s.forecast.daysLeft) === 1 ? "day" : "days"} left`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-800">Nothing is running low.</p>
        )}
      </section>
    </>
  );
}
