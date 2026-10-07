"use client";

import { Pie, PieChart, Tooltip } from "recharts";
import type { SpendingSlice } from "@/lib/accounts";
import { cn } from "@/lib/utils";

// Slots are assigned biggest-first; "Other" always gets the neutral gray.
const SLOT_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
];

function colorFor(slice: SpendingSlice, index: number) {
  return slice.name === "Other" ? "var(--series-other)" : SLOT_COLORS[index];
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function SpendingDonut({
  slices,
  total,
  size = 200,
  className,
}: {
  slices: SpendingSlice[];
  total: number;
  size?: number;
  className?: string;
}) {
  if (slices.length === 0) {
    return <p className="text-sm text-muted-foreground">No spending in this period.</p>;
  }

  const data = slices.map((s, i) => ({ ...s, fill: colorFor(s, i) }));

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0 self-center" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={size * 0.32}
            outerRadius={size * 0.48}
            startAngle={90}
            endAngle={-270}
            stroke="var(--background)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const slice = payload[0].payload as SpendingSlice;
              return (
                <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
                  <p className="font-medium">{slice.name}</p>
                  <p className="text-muted-foreground">
                    {money(slice.amount)} · {Math.round((slice.amount / total) * 100)}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="text-sm font-bold">{money(total)}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.fill }}
            />
            <span className="min-w-0 flex-1 truncate">{slice.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round((slice.amount / total) * 100)}%
            </span>
            <span className="w-20 text-right tabular-nums">{money(slice.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
