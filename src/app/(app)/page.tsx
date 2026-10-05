import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
import { pageTitle, stagger, tagClass } from "@/components/field";
import { Screen } from "@/components/screen";
import { listCategories } from "@/lib/data/categories";
import { listRecentEntries } from "@/lib/data/entries";
import { listEntryItems } from "@/lib/data/items";
import { formatDay, formatINR, formatQty, formatWhen } from "@/lib/format";
import { getCurrentShopId } from "@/lib/shop";
import { EntryTabs, type EntryTab } from "./entry-form";

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: EntryTab = tab === "bought" ? "bought" : "sold";
  const shopId = await getCurrentShopId();
  const [categories, items, recent] = await Promise.all([
    listCategories(shopId),
    listEntryItems(shopId),
    listRecentEntries(shopId),
  ]);
  const now = new Date();

  return (
    <Screen>
      <div className="flex items-end justify-between gap-3">
        <h1 className={pageTitle}>Entry</h1>
        <p className="stamp pb-1.5 text-ink-2">{formatDay(now)}</p>
      </div>

      {/* Wide screens: the form and Recent side by side */}
      <div className="flex flex-col gap-5 min-[88rem]:grid min-[88rem]:grid-cols-[minmax(0,1fr)_20rem] min-[88rem]:items-start min-[88rem]:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <EntryTabs initialTab={initialTab} items={items} categories={categories} />
        </div>

        <section
          aria-labelledby="recent-heading"
          className="flex flex-col gap-3 pt-2 min-[88rem]:pt-0"
        >
          <h2 id="recent-heading" className="headline flex items-center gap-2 text-2xl">
            <ClockCounterClockwiseIcon aria-hidden weight="bold" className="size-6" />
            Recent
          </h2>
          {recent.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-line p-5 text-ink-2">
              Nothing saved yet. Sales and purchases show up here with their date and time.
            </p>
          ) : (
            // Same ledger as Items: one list, rows split by rules
            <ul className="divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-line bg-surface">
              {recent.map((r, n) => (
                <li
                  key={r.id}
                  className="enter flex items-center justify-between gap-4 px-4 py-3"
                  style={stagger(n)}
                >
                  <div className="min-w-0">
                    <p className="text-lg leading-snug font-bold break-words">{r.name}</p>
                    <p className="text-sm text-ink-2">
                      <time dateTime={r.createdAt.toISOString()}>
                        {formatWhen(r.createdAt, now)}
                      </time>
                      {r.amount != null && `, ${formatINR(r.amount)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="headline text-xl tabular-nums">
                      {formatQty(r.quantity)}{" "}
                      <span className="text-sm font-bold tracking-normal text-ink-2">{r.unit}</span>
                    </p>
                    <span
                      className={`${tagClass.base} ${r.type === "sale" ? tagClass.sale : tagClass.restock}`}
                    >
                      {r.type === "sale" ? "Sold" : "Bought"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Screen>
  );
}
