import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { inputClass, key, pageTitle, textLink } from "@/components/field";
import { Screen } from "@/components/screen";
import { Ticker } from "@/components/ticker";
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

const h2 = "text-xl font-extrabold text-ink";
const ledger = "divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-line bg-surface";

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
    <Screen>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
        <h1 className={pageTitle}>Insights</h1>

        <form
          className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] xl:w-[34rem] xl:shrink-0"
          aria-label="Filters"
        >
          <label htmlFor="range" className="sr-only">
            Period
          </label>
          <select id="range" name="range" defaultValue={String(range)} className={inputClass}>
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
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={`${key("secondary")} col-span-2 sm:col-span-1`}>
            Apply
          </button>
        </form>
      </div>
      {categoryName && (
        <p className="text-sm font-semibold text-ink-2">
          Showing {categoryName} only.{" "}
          <Link href={`/insights?range=${range}`} className={textLink}>
            Show all
          </Link>
        </p>
      )}

      {/* Today's tally: the one signboard block on this screen */}
      <section
        aria-labelledby="today-heading"
        className="enter flex flex-col gap-3 rounded-xl border-2 border-key-primary-edge bg-accent p-5 text-on-accent"
      >
        <h2 id="today-heading" className="stamp">
          Today
        </h2>
        {/* Phones: revenue above sales | low stock. From lg: all three in one row. */}
        <dl className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-0">
          <div className="min-w-0">
            <dt className="font-bold">Revenue</dt>
            <dd className="headline text-[clamp(2.25rem,11vw,3.25rem)] break-words">
              <Ticker value={today.revenue} format="inr" />
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t-2 border-on-accent/20 pt-3 lg:contents">
            <div className="lg:border-l-2 lg:border-on-accent/20 lg:pl-5">
              <dt className="font-bold">Sales</dt>
              <dd className="headline text-3xl lg:text-4xl">
                <Ticker value={today.sales} />
              </dd>
            </div>
            <div className="relative lg:border-l-2 lg:border-on-accent/20 lg:pl-5">
              <dt className="font-bold">
                {/* Stretched link: the whole cell opens Alerts */}
                <Link
                  href="/alerts"
                  transitionTypes={["nav-back"]}
                  className="inline-flex items-center gap-1 underline decoration-2 underline-offset-4 after:absolute after:inset-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-on-accent"
                >
                  Low stock
                  <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
                </Link>
              </dt>
              <dd className="headline text-3xl tabular-nums lg:text-4xl">{lowHere.length}</dd>
            </div>
          </div>
        </dl>
      </section>

      {/* Wide screens: charts on the left, lists on the right */}
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start xl:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="time-heading" className="reveal flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="time-heading" className={h2}>
                Revenue, last {range} days
              </h2>
              <p className="font-semibold text-ink-2">
                Total{" "}
                <span className="font-extrabold text-ink tabular-nums">
                  {formatINR(rangeRevenue)}
                </span>
              </p>
            </div>
            <div className="rounded-xl border-2 border-line bg-surface px-2 pt-4 pb-2">
              <SalesOverTimeChart data={days} />
            </div>
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

          <section aria-labelledby="cat-heading" className="reveal flex flex-col gap-3">
            <h2 id="cat-heading" className={h2}>
              Revenue by category, last {range} days
            </h2>
            {byCategory.length ? (
              <>
                <div className="rounded-xl border-2 border-line bg-surface px-2 py-4">
                  <SalesByCategoryChart data={byCategory} />
                </div>
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
              <p className="rounded-xl border-2 border-dashed border-line p-5 font-semibold text-ink-2">
                No sales in this period.
              </p>
            )}
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="top-heading" className="reveal flex flex-col gap-3">
            <h2 id="top-heading" className={h2}>
              Top 5 items, last {TOP_ITEMS_DAYS} days
            </h2>
            {top.length ? (
              <ol className={ledger}>
                {top.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-4 px-4 py-3">
                    <span
                      aria-hidden
                      className={`headline w-6 text-3xl tabular-nums ${i === 0 ? "text-ink" : "text-ink-2"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-bold break-words">{t.name}</p>
                      <p className="text-sm text-ink-2 tabular-nums">
                        {formatQty(t.units)} {t.unit}
                      </p>
                    </div>
                    <p className="shrink-0 font-extrabold tabular-nums">{formatINR(t.revenue)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border-2 border-dashed border-line p-5 font-semibold text-ink-2">
                No sales this week.
              </p>
            )}
          </section>

          <section aria-labelledby="low-heading" className="reveal flex flex-col gap-3">
            <h2 id="low-heading" className={h2}>
              Running low
            </h2>
            {lowHere.length ? (
              <ul className={ledger}>
                {lowHere.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/items/${s.id}`}
                      transitionTypes={["nav-forward"]}
                      className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-sunken focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus"
                    >
                      <span className="min-w-0 leading-snug font-bold break-words">{s.name}</span>
                      <span className="shrink-0 font-extrabold text-danger tabular-nums">
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
              <p className="rounded-xl border-2 border-ok bg-ok-soft p-5 font-semibold text-ink">
                Nothing is running low.
              </p>
            )}
          </section>
        </div>
      </div>
    </Screen>
  );
}
