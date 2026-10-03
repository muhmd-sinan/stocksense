"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "@/lib/format";
import { formatDayKey, type DayPoint } from "@/lib/insights";
import type { CategoryPoint } from "@/lib/data/insights";

const EMERALD = "#065f46";
const AXIS = { fontSize: 12, fill: "#334155" };
const compactINR = (v: number) =>
  v >= 1000 ? `₹${Math.round(v / 100) / 10}k` : `₹${Math.round(v)}`;

// Charts are hidden from screen readers; each has an equivalent data table in the page.

export function SalesOverTimeChart({ data }: { data: DayPoint[] }) {
  return (
    <div aria-hidden className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDayKey}
            tick={AXIS}
            minTickGap={24}
            tickLine={false}
          />
          <YAxis tickFormatter={compactINR} tick={AXIS} width={52} tickLine={false} />
          <Tooltip
            labelFormatter={(d) => formatDayKey(String(d))}
            formatter={(v) => [formatINR(Number(v)), "Revenue"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={EMERALD}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesByCategoryChart({ data }: { data: CategoryPoint[] }) {
  return (
    <div aria-hidden className="w-full" style={{ height: Math.max(120, data.length * 44 + 24) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tickFormatter={compactINR} tick={AXIS} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={AXIS} width={88} tickLine={false} />
          <Tooltip formatter={(v) => [formatINR(Number(v)), "Revenue"]} />
          <Bar dataKey="revenue" fill={EMERALD} radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
