import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { pageTitle, stagger, tagClass } from "@/components/field";
import { Screen } from "@/components/screen";
import { getLowStock, type StockStatus } from "@/lib/data/alerts";
import { DAYS_LEFT_ALERT, WINDOW_DAYS } from "@/lib/forecast";
import { formatQty } from "@/lib/format";
import { getCurrentShopId } from "@/lib/shop";

function reasonText(s: StockStatus): string {
  if (s.reason === "out") return "Out of stock";
  if (s.reason === "threshold") return `At or below your alert level of ${formatQty(s.threshold)}`;
  return `Runs out within ${DAYS_LEFT_ALERT} days at the current pace`;
}

function daysLeftText(s: StockStatus): string {
  const f = s.forecast;
  if (s.stock <= 0) return "0 days left";
  if (f.daysLeft == null)
    return f.confidence === "none" ? "No sales history yet" : "No recent sales";
  const whole = Math.floor(f.daysLeft);
  const d = f.daysLeft < 1 ? "Less than 1 day" : `About ${whole} ${whole === 1 ? "day" : "days"}`;
  return `${d} left${f.confidence === "low" ? " (new item, rough guess)" : ""}`;
}

export default async function AlertsPage() {
  const shopId = await getCurrentShopId();
  const low = await getLowStock(shopId);

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className={`${pageTitle} flex items-center gap-3`}>
          Alerts
          {low.length > 0 && (
            <span
              aria-hidden
              className="rounded-full bg-danger px-3 py-1 text-xl text-on-solid tabular-nums"
            >
              {low.length}
            </span>
          )}
        </h1>
        <p className="max-w-[60ch] text-ink-2">
          Items at or below their alert level, or forecast to run out within {DAYS_LEFT_ALERT} days
          (from average daily sales over the last {WINDOW_DAYS} days).
        </p>
      </div>

      {low.length === 0 ? (
        <div className="enter flex flex-col items-start gap-2 rounded-xl border-2 border-ok bg-ok-soft p-6">
          <CheckCircleIcon aria-hidden weight="fill" className="size-10 text-ok" />
          <p className="text-lg font-extrabold">Nothing is running low.</p>
          <p className="text-ink">Items show up here when they near their alert level.</p>
        </div>
      ) : (
        <ul
          className="divide-y-2 divide-line overflow-hidden rounded-xl border-2 border-line bg-surface"
          aria-label={`${low.length} items low on stock`}
        >
          {low.map((s, n) => (
            <li key={s.id} className="enter" style={stagger(n)}>
              <Link
                href={`/items/${s.id}`}
                transitionTypes={["nav-forward"]}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-sunken focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{s.name}</p>
                  <p className="text-sm font-bold text-danger">{reasonText(s)}</p>
                  <p className="text-sm text-ink-2">
                    {daysLeftText(s)}
                    {s.forecast.dailyRate > 0 &&
                      `, sells ~${formatQty(Math.round(s.forecast.dailyRate * 10) / 10)}/day`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {s.stock <= 0 ? (
                    <span className={`${tagClass.base} ${tagClass.danger} text-sm`}>Out</span>
                  ) : (
                    <p className="headline text-3xl text-danger tabular-nums">
                      {formatQty(s.stock)}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-ink-2">{s.unit} left</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
