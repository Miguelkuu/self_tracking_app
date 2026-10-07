import Link from "next/link";
import { ChevronRight, Dumbbell, GraduationCap, Receipt, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { ensureUpcomingBillPayments } from "@/lib/bills";
import { getAccountBalances } from "@/lib/accounts";
import { getFeedStatus, syncSchoolFeedIfStale } from "@/lib/school-feed";
import { SchoolCalendar } from "@/components/school/school-calendar";
import { daysAround, getCalendarData } from "@/lib/school-calendar";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Block({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {title}
        </h2>
        <Link
          href={href}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          Open
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function MoneyBox({
  label,
  total,
  accounts,
  negative,
}: {
  label: string;
  total: number;
  accounts: { id: string; name: string; balance: number }[];
  negative?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={negative && total < 0 ? "text-2xl font-bold text-red-600" : "text-2xl font-bold"}>
        {money(total)}
      </p>
      {accounts.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {accounts.map((a) => (
            <li key={a.id}>
              <Link href={`/accounts/${a.id}`} className="flex justify-between gap-2 hover:text-foreground">
                <span className="truncate">{a.name}</span>
                <span className="tabular-nums">{money(a.balance)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  await Promise.all([ensureUpcomingBillPayments(), syncSchoolFeedIfStale()]);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [upcomingBills, calendar, feed, weekSessions, lastSession, accounts] =
    await Promise.all([
      prisma.billPayment.findMany({
        where: {
          paid: false,
          dueDate: { lte: weekFromNow },
          bill: { archived: false },
        },
        include: { bill: true },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      // Wide enough to cover this week + next in any timezone; the calendar
      // picks the exact 14 days in the browser.
      getCalendarData(...daysAround(8, 16)),
      getFeedStatus(),
      prisma.workoutSession.count({
        where: { date: { gte: startOfWeek } },
      }),
      prisma.workoutSession.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
      getAccountBalances(),
    ]);

  const cashAccounts = accounts.filter((a) => a.type === "CHECKING" || a.type === "SAVINGS");
  const cardAccounts = accounts.filter((a) => a.type === "CREDIT_CARD");
  const cash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  const cardDebt = cardAccounts.reduce((sum, a) => sum + Math.min(0, a.balance), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <Block title="Finances" icon={Wallet} href="/accounts">
        {cashAccounts.length === 0 && cardAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Mark your accounts as checking, savings or credit card (Accounts → open an account →
            Settings) to see them here.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyBox label="Checking + savings" total={cash} accounts={cashAccounts} />
            <MoneyBox label="Credit cards" total={cardDebt} accounts={cardAccounts} negative />
          </div>
        )}
      </Block>

      <Block title="School" icon={GraduationCap} href="/school">
        {!feed.connected && (
          <p className="mb-3 text-sm text-muted-foreground">
            Connect your class calendar feed on the{" "}
            <Link href="/school" className="underline">
              School
            </Link>{" "}
            page to fill this in automatically.
          </p>
        )}
        {feed.error && (
          <p className="mb-3 text-sm text-red-600">Calendar sync failed: {feed.error}</p>
        )}
        <SchoolCalendar assignments={calendar.assignments} classes={calendar.classes} />
      </Block>

      <Block title="Bills due soon" icon={Receipt} href="/bills">
        {upcomingBills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bills due in the next 7 days.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingBills.map((payment) => {
              const overdue = payment.dueDate < now;
              return (
                <li
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{payment.bill.name}</p>
                    <p className={overdue ? "text-xs text-red-600" : "text-xs text-muted-foreground"}>
                      Due {payment.dueDate.toLocaleDateString()}
                      {overdue ? " (overdue)" : ""}
                    </p>
                  </div>
                  <span className="font-medium">{money(Number(payment.amount))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block title="Gym" icon={Dumbbell} href="/gym">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Workouts this week</p>
            <p className="text-2xl font-bold">{weekSessions}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Last workout</p>
            <p className="text-2xl font-bold">
              {lastSession ? lastSession.date.toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      </Block>
    </div>
  );
}
