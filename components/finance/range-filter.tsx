import Link from "next/link";
import { RANGES, type Range } from "@/lib/accounts";
import { cn } from "@/lib/utils";

export function RangeFilter({ basePath, current }: { basePath: string; current: Range }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(Object.keys(RANGES) as Range[]).map((range) => (
        <Link
          key={range}
          href={`${basePath}?range=${range}`}
          className={cn(
            "rounded-md px-3 py-1 text-sm",
            range === current
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {RANGES[range]}
        </Link>
      ))}
    </div>
  );
}
