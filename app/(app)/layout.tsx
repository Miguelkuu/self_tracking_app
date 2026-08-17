import { AppShell } from "@/components/app-shell";

// Every page under this layout reads live data straight from Postgres via
// Prisma on each request (accounts, transactions, bills, etc.) — none of it
// should ever be frozen into a build-time static shell.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
