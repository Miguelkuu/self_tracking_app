import { prisma } from "@/lib/db";
import { getAccountBalances } from "@/lib/accounts";
import { monthsUntil } from "@/lib/loans";

// Categories where spending is usually a choice, and how much of it the
// planner suggests cutting. Everything else (insurance, gas, loans...) is
// treated as fixed and never suggested.
export const FLEXIBLE_CATEGORIES: Record<string, number> = {
  Snacks: 0.5,
  "Restaurants/Dining": 0.5,
  Entertainment: 0.5,
  Subscriptions: 0.25,
  Electronics: 0.5,
  "General Merchandise": 0.25,
  Groceries: 0.15,
  "Personal Care": 0.25,
};

// How far back averages look. Long enough to smooth out one odd month.
const WINDOW_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;

export async function getPlanData() {
  const from = new Date(Date.now() - WINDOW_DAYS * DAY);

  const [accounts, earliest, flows, byCategory, categories] = await Promise.all([
    getAccountBalances(),
    prisma.transaction.findFirst({
      where: { isTransfer: false, date: { gte: from } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.transaction.groupBy({
      by: ["kind"],
      where: { isTransfer: false, date: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { kind: "EXPENSE", isTransfer: false, date: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  // If you only imported 6 weeks of history, average over 6 weeks, not 90 days.
  const daysCovered = earliest
    ? Math.min(WINDOW_DAYS, Math.max(30, (Date.now() - earliest.date.getTime()) / DAY))
    : 30;
  const months = daysCovered / 30.4;
  const perMonth = (n: unknown) => Number(n ?? 0) / months;

  const cards = accounts
    .filter((a) => a.type === "CREDIT_CARD" && a.balance < 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      owed: -a.balance,
      apr: a.apr,
      minFloor: a.minPayment,
      creditLimit: a.creditLimit,
    }));

  const loans = accounts
    .filter((a) => a.loan && a.loan.remaining > 0.005)
    .map((a) => ({
      id: a.id,
      name: a.name,
      owed: a.loan!.remaining,
      monthlyPayment: a.loan!.monthlyPayment,
      paymentsLeft: a.loan!.paymentsLeft,
      // Month index (from now) of the final payment; null = never ends.
      endsAfterMonth: a.loan!.lastPayment ? monthsUntil(a.loan!.lastPayment) : null,
      lastPayment: a.loan!.lastPayment?.toISOString() ?? null,
    }));

  return {
    monthsOfData: months,
    loans,
    checking: accounts.filter((a) => a.type === "CHECKING").reduce((s, a) => s + a.balance, 0),
    savings: accounts.filter((a) => a.type === "SAVINGS").reduce((s, a) => s + a.balance, 0),
    hasTypedAccounts: accounts.some((a) => a.type !== "OTHER"),
    cards,
    monthlyIncome: perMonth(flows.find((f) => f.kind === "INCOME")?._sum.amount),
    monthlySpending: perMonth(flows.find((f) => f.kind === "EXPENSE")?._sum.amount),
    categories: byCategory
      .map((c) => {
        const name = categories.find((x) => x.id === c.categoryId)?.name ?? "Uncategorized";
        return { name, monthly: perMonth(c._sum.amount), suggestedCut: FLEXIBLE_CATEGORIES[name] ?? 0 };
      })
      .filter((c) => c.monthly >= 1)
      .sort((a, b) => b.monthly - a.monthly),
  };
}

export type PlanData = Awaited<ReturnType<typeof getPlanData>>;
