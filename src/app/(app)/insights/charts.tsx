"use client";

import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "@/lib/format";
import { formatDayKey, type DayPoint } from "@/lib/insights";
import type { CategoryPoint } from "@/lib/data/insights";

// Colours come from the theme tokens via `.chart` rules in globals.css, so both themes work.
// Charts are hidden from screen readers; each has an equivalent data table in the page.

const compactINR = (v: number) =>
  v >= 1000 ? `₹${Math.round(v / 100) / 10}k` : `₹${Math.round(v)}`;

const tooltip = {
  contentStyle: {
    background: "var(--surface)",
    border: "2px solid var(--edge)",
    borderRadius: 12,
    color: "var(--ink)",
    fontWeight: 700,
  },
  labelStyle: { color: "var(--ink-2)" },
  itemStyle: { color: "var(--ink)" },
};

export function SalesOverTimeChart({ data }: { data: DayPoint[] }) {
  const animate = !useReducedMotion();
  return (
    <div aria-hidden className="chart h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickFormatter={formatDayKey} minTickGap={24} tickLine={false} />
          <YAxis tickFormatter={compactINR} width={52} tickLine={false} axisLine={false} />
          <Tooltip
            {...tooltip}
            labelFormatter={(d) => formatDayKey(String(d))}
            formatter={(v) => [formatINR(Number(v)), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            strokeWidth={2.5}
            activeDot={{ r: 5, strokeWidth: 2 }}
            isAnimationActive={animate}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesByCategoryChart({ data }: { data: CategoryPoint[] }) {
  const animate = !useReducedMotion();
  return (
    <div
      aria-hidden
      className="chart w-full"
      style={{ height: Math.max(120, data.length * 48 + 24) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickFormatter={compactINR} tickLine={false} />
          <YAxis type="category" dataKey="name" width={88} tickLine={false} axisLine={false} />
          <Tooltip {...tooltip} formatter={(v) => [formatINR(Number(v)), "Revenue"]} />
          <Bar
            dataKey="revenue"
            radius={[0, 6, 6, 0]}
            barSize={26}
            isAnimationActive={animate}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
