import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// A bar you click to show or hide its contents (native <details>, so it works
// without JavaScript and with the keyboard).
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  className,
  children,
}: {
  title: React.ReactNode;
  count?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-md border", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between p-3 font-medium hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {count !== undefined && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">{count}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t p-3">{children}</div>
    </details>
  );
}
