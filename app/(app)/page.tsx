import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureUpcomingBillPayments } from "@/lib/bills";

export default async function DashboardPage() {
  await ensureUpcomingBillPayments();

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [upcomingBills, upcomingAssignments, weekSessions, accounts] = await Promise.all([
    prisma.billPayment.findMany({
      where: { paid: false, dueDate: { lte: weekFromNow } },
      include: { bill: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.assignment.findMany({
      where: { done: false, dueDate: { lte: weekFromNow } },
      include: { subject: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.workoutSession.count({
      where: { date: { gte: startOfWeek } },
    }),
    prisma.account.findMany({
      where: { archived: false },
      include: { transactions: true },
    }),
  ]);

  const totalBalance = accounts.reduce((sum, account) => {
    const balance = account.transactions.reduce((total, t) => {
      const amount = Number(t.amount);
      return t.kind === "INCOME" ? total + amount : total - amount;
    }, Number(account.startingBalance));
    return sum + balance;
  }, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Total balance</p>
          <p className="text-xl font-bold">${totalBalance.toFixed(2)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Workouts this week</p>
          <p className="text-xl font-bold">{weekSessions}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">Bills due soon</p>
          <p className="text-xl font-bold">{upcomingBills.length}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Due soon</h2>
        {upcomingBills.length === 0 && upcomingAssignments.length === 0 ? (
          <p className="text-muted-foreground">Nothing due in the next 7 days.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingBills.map((payment) => {
              const overdue = payment.dueDate < now;
              return (
                <li
                  key={`bill-${payment.id}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{payment.bill.name}</p>
                    <p
                      className={
                        overdue ? "text-xs text-red-600" : "text-xs text-muted-foreground"
                      }
                    >
                      Bill · Due {payment.dueDate.toLocaleDateString()}
                      {overdue ? " (overdue)" : ""}
                    </p>
                  </div>
                  <span className="font-medium">${Number(payment.amount).toFixed(2)}</span>
                </li>
              );
            })}
            {upcomingAssignments.map((assignment) => {
              const overdue = assignment.dueDate < now;
              return (
                <li
                  key={`assignment-${assignment.id}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p
                      className={
                        overdue ? "text-xs text-red-600" : "text-xs text-muted-foreground"
                      }
                    >
                      {assignment.subject.name} · Due {assignment.dueDate.toLocaleDateString()}
                      {overdue ? " (overdue)" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{assignment.type}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/finance" className="underline">
          Finance
        </Link>
        <Link href="/bills" className="underline">
          Bills
        </Link>
        <Link href="/school" className="underline">
          School
        </Link>
        <Link href="/gym" className="underline">
          Gym
        </Link>
      </div>
    </div>
  );
}
