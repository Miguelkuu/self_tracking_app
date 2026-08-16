"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  GraduationCap,
  Dumbbell,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/school", label: "School", icon: GraduationCap },
  { href: "/gym", label: "Gym", icon: Dumbbell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:p-4">
        <div className="mb-6 flex items-center justify-between px-2">
          <h1 className="text-lg font-bold">Self-Tracker</h1>
          <ThemeToggle />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </form>
      </aside>

      <header className="flex items-center justify-between border-b p-4 md:hidden">
        <h1 className="text-lg font-bold">Self-Tracker</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              aria-label="Log out"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-4 pb-20 md:pb-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-background md:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
