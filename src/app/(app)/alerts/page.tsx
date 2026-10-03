import Link from "next/link";
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
    <>
      <h1 className="text-2xl font-bold text-slate-950">Alerts</h1>
      <p className="text-slate-800">
        Items at or below their alert level, or forecast to run out within {DAYS_LEFT_ALERT} days
        (based on average daily sales over the last {WINDOW_DAYS} days).
      </p>

      {low.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center text-lg text-slate-800">
          Nothing is running low.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={`${low.length} items low on stock`}>
          {low.map((s) => (
            <li key={s.id}>
              <Link
                href={`/items/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-red-200 bg-white p-4 hover:border-red-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-950">{s.name}</p>
                  <p className="text-sm font-medium text-red-900">{reasonText(s)}</p>
                  <p className="text-sm text-slate-700">
                    {daysLeftText(s)}
                    {s.forecast.dailyRate > 0 &&
                      ` · sells ~${formatQty(Math.round(s.forecast.dailyRate * 10) / 10)}/day`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-red-800">{formatQty(s.stock)}</p>
                  <p className="text-sm text-slate-700">{s.unit} left</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
