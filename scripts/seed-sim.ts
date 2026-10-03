// Pure sales-history simulation used by the seed script. No DB access, so it's unit-testable.

export type SimItem = {
  key: string;
  /** Average units sold per day */
  demand: number;
  openingStock: number;
  /** Restock when end-of-day stock falls to this level */
  reorderAt: number;
  /** Units added per restock */
  reorderQty: number;
  /** Days before `now` the item was created (defaults to full history) */
  ageDays?: number;
  /** Stop restocking in the last N days so some items end up low */
  noRestockLastDays?: number;
};

export type SimTx = {
  key: string;
  type: "sale" | "restock";
  quantity: number;
  at: Date;
};

const DAY = 86_400_000;
const IST_OFFSET = 5.5 * 3_600_000;

/** Deterministic PRNG so seeds are reproducible */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson sample (Knuth); fine for the small means we use */
function poisson(mean: number, rand: () => number) {
  const l = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

// Sun..Sat multipliers: busier weekends
const WEEKDAY_FACTOR = [1.3, 0.9, 0.9, 0.95, 1.0, 1.15, 1.35];

/** Midnight IST (as a UTC instant) for the day `daysAgo` before `now` */
function istDayStart(now: number, daysAgo: number) {
  const istNow = now + IST_OFFSET;
  const istMidnight = istNow - (istNow % DAY);
  return istMidnight - IST_OFFSET - daysAgo * DAY;
}

export function simulate(
  items: SimItem[],
  opts: { days: number; now: Date; seed?: number },
): { txs: SimTx[]; finalStock: Record<string, number>; createdAt: Record<string, Date> } {
  const rand = mulberry32(opts.seed ?? 42);
  const now = opts.now.getTime();
  const txs: SimTx[] = [];
  const finalStock: Record<string, number> = {};
  const createdAt: Record<string, Date> = {};

  // One random spike day per ~20 days (festival/wedding orders)
  const spikeDays = new Set<number>();
  for (let d = opts.days; d >= 0; d--) if (rand() < 0.05) spikeDays.add(d);

  for (const item of items) {
    const age = Math.min(item.ageDays ?? opts.days, opts.days);
    const start = istDayStart(now, age);
    createdAt[item.key] = new Date(start + 7 * 3_600_000);
    let stock = item.openingStock;
    txs.push({
      key: item.key,
      type: "restock",
      quantity: stock,
      at: new Date(start + 7 * 3_600_000),
    });

    for (let d = age; d >= 0; d--) {
      const dayStart = istDayStart(now, d);
      const weekday = new Date(dayStart + IST_OFFSET).getUTCDay();
      let mean = item.demand * WEEKDAY_FACTOR[weekday];
      if (spikeDays.has(d)) mean *= 2.5;
      // Today: only the part of the day that has already happened
      const dayEnd = d === 0 ? now : dayStart + 21 * 3_600_000;
      const openFrom = dayStart + 8 * 3_600_000;
      if (dayEnd <= openFrom) continue;
      if (d === 0) mean *= Math.min(1, (dayEnd - openFrom) / (13 * 3_600_000));

      let sold = Math.min(poisson(mean, rand), stock);
      // Split the day's sales into a few customer transactions
      while (sold > 0) {
        const q = Math.min(sold, 1 + Math.floor(rand() * 3));
        const at = openFrom + Math.floor(rand() * (dayEnd - openFrom));
        txs.push({ key: item.key, type: "sale", quantity: q, at: new Date(at) });
        stock -= q;
        sold -= q;
      }

      const restockAllowed = d > (item.noRestockLastDays ?? 0);
      if (restockAllowed && item.reorderQty > 0 && d > 0 && stock <= item.reorderAt) {
        // Next morning, before opening
        const at = istDayStart(now, d - 1) + 7.5 * 3_600_000;
        txs.push({ key: item.key, type: "restock", quantity: item.reorderQty, at: new Date(at) });
        stock += item.reorderQty;
      }
    }
    finalStock[item.key] = stock;
  }

  txs.sort((a, b) => a.at.getTime() - b.at.getTime());
  return { txs, finalStock, createdAt };
}
