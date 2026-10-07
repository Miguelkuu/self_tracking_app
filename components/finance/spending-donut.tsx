"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

// Kept in sync with OTHER in lib/accounts (importing it would pull Prisma
// into the browser bundle).
const OTHER = "Other";

function colorFor(slice: SpendingSlice, index: number) {
  return slice.name === OTHER ? "var(--series-other)" : SLOT_COLORS[index];
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function SpendingDonut({
  slices,
  total,
  size = 200,
  selected,
  linkBase,
  className,
}: {
  slices: SpendingSlice[];
  total: number;
  size?: number;
  // The highlighted category, if any.
  selected?: string | null;
  // When set, slices and legend rows link to `${linkBase}&category=<name>`
  // (clicking the selected one again clears it). "Other" isn't a single
  // category, so it never links.
  linkBase?: string;
  className?: string;
}) {
  const router = useRouter();

  if (slices.length === 0) {
    return <p className="text-sm text-muted-foreground">No spending in this period.</p>;
  }

  const hrefFor = (name: string) => {
    if (!linkBase || name === OTHER) return null;
    return name === selected ? linkBase : `${linkBase}&category=${encodeURIComponent(name)}`;
  };

  const data = slices.map((s, i) => ({
    ...s,
    fill: colorFor(s, i),
    fillOpacity: selected && s.name !== selected ? 0.3 : 1,
  }));
  const selectedSlice = slices.find((s) => s.name === selected);

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
            className={linkBase ? "cursor-pointer" : undefined}
            onClick={(entry: { name?: string }) => {
              const href = entry.name ? hrefFor(entry.name) : null;
              if (href) router.push(href, { scroll: false });
            }}
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {selectedSlice ? selectedSlice.name : "Spent"}
          </span>
          <span className="text-sm font-bold">{money(selectedSlice?.amount ?? total)}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {data.map((slice) => {
          const href = hrefFor(slice.name);
          const row = (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.fill, opacity: slice.fillOpacity }}
              />
              <span className="min-w-0 flex-1 truncate">{slice.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round((slice.amount / total) * 100)}%
              </span>
              <span className="w-20 text-right tabular-nums">{money(slice.amount)}</span>
            </>
          );
          const rowClass = cn(
            "flex items-center gap-2 rounded-md px-1 py-0.5",
            slice.name === selected && "bg-muted font-medium"
          );
          return (
            <li key={slice.name}>
              {href ? (
                <Link href={href} scroll={false} className={cn(rowClass, "hover:bg-muted/50")}>
                  {row}
                </Link>
              ) : (
                <div className={rowClass}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
