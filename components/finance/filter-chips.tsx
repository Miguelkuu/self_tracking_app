import Link from "next/link";
import { cn } from "@/lib/utils";

export type Chip = { key: string; label: React.ReactNode; href: string; active: boolean };

// A row of links that act like toggle buttons (date range, category, account).
// Links keep the choice in the URL, so it survives refreshes and back/forward.
export function FilterChips({ chips, label }: { chips: Chip[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-current={chip.active ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm",
            chip.active
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {chip.label}
        </Link>
      ))}
    </nav>
  );
}
