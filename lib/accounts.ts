import { prisma } from "@/lib/db";
import { loanStatus, type Loan } from "@/lib/loans";

export const RANGES = {
  month: "This month",
  "3m": "Last 3 months",
  year: "This year",
  all: "All time",
} as const;

export type Range = keyof typeof RANGES;

export function parseRange(value: string | string[] | undefined): Range {
  return typeof value === "string" && value in RANGES ? (value as Range) : "month";
}

// Builds an Accounts-tab URL, keeping the filters that are set.
export function accountsHref(
  path: string,
  { range, category }: { range: Range; category?: string | null }
) {
  const params = new URLSearchParams({ range });
  if (category) params.set("category", category);
  return `${path}?${params}`;
}

export function rangeChips(path: string, current: Range, category?: string | null) {
  return (Object.keys(RANGES) as Range[]).map((range) => ({
    key: range,
    label: RANGES[range],
    href: accountsHref(path, { range, category }),
    active: range === current,
  }));
}

// Transaction dates are stored as UTC midnight, so range boundaries are too.
export function rangeStart(range: Range): Date | undefined {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  switch (range) {
    case "month":
      return new Date(Date.UTC(year, month, 1));
    case "3m":
      return new Date(Date.UTC(year, month - 2, 1));
    case "year":
      return new Date(Date.UTC(year, 0, 1));
    case "all":
      return undefined;
  }
}

type AccountRow = Awaited<ReturnType<typeof prisma.account.findMany>>[number];

export function toLoan(account: AccountRow): Loan | null {
  if (
    account.type !== "LOAN" ||
    account.loanAmount === null ||
    account.monthlyPayment === null ||
    account.nextPaymentDate === null
  ) {
    return null;
  }
  return {
    amount: Number(account.loanAmount),
    monthlyPayment: Number(account.monthlyPayment),
    apr: Number(account.apr ?? 0),
    firstPayment: account.nextPaymentDate,
  };
}

// Balance = starting balance + income - expenses, summed in the database.
// Loans are the exception: their balance follows the payment schedule.
export async function getAccountBalances(accountIds?: string[]) {
  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({
      where: accountIds ? { id: { in: accountIds } } : { archived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "kind"],
      where: accountIds ? { accountId: { in: accountIds } } : undefined,
      _sum: { amount: true },
    }),
  ]);

  return accounts.map((account) => {
    const transactionTotal = sums
      .filter((s) => s.accountId === account.id)
      .reduce((total, s) => {
        const amount = Number(s._sum.amount ?? 0);
        return s.kind === "INCOME" ? total + amount : total - amount;
      }, 0);
    const loan = toLoan(account);
    const loanInfo = loan ? { ...loan, ...loanStatus(loan) } : null;

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balance: loanInfo ? -loanInfo.remaining : Number(account.startingBalance) + transactionTotal,
      transactionTotal,
      apr: account.apr === null ? null : Number(account.apr),
      creditLimit: account.creditLimit === null ? null : Number(account.creditLimit),
      minPayment: account.minPayment === null ? null : Number(account.minPayment),
      loan: loanInfo,
    };
  });
}

export type SpendingSlice = { name: string; amount: number };

// A donut stops being readable past ~6 segments, so the biggest categories
// keep their own slice and everything else folds into "Other".
const MAX_SLICES = 5;

export const UNCATEGORIZED = "Uncategorized";
export const OTHER = "Other";

export async function getSpendingByCategory({
  accountId,
  from,
  keep,
}: {
  accountId?: string;
  from?: Date;
  // A category that must keep its own slice (the selected one), even if
  // it's small enough to be folded into "Other".
  keep?: string;
}): Promise<{ slices: SpendingSlice[]; all: SpendingSlice[]; total: number }> {
  const [sums, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        kind: "EXPENSE",
        isTransfer: false,
        accountId,
        date: from ? { gte: from } : undefined,
      },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  // Keyed by name, because the category filter in the URL works by name.
  const byName = new Map<string, number>();
  for (const s of sums) {
    const name = categories.find((c) => c.id === s.categoryId)?.name ?? UNCATEGORIZED;
    byName.set(name, (byName.get(name) ?? 0) + Number(s._sum.amount ?? 0));
  }
  const all = [...byName]
    .map(([name, amount]) => ({ name, amount }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = all.reduce((sum, s) => sum + s.amount, 0);
  if (all.length <= MAX_SLICES + 1) return { slices: all, all, total };

  const kept = all.slice(0, MAX_SLICES);
  const keptSelected = all.find((s) => s.name === keep);
  if (keptSelected && !kept.includes(keptSelected)) kept[MAX_SLICES - 1] = keptSelected;
  const rest = all.filter((s) => !kept.includes(s)).reduce((sum, s) => sum + s.amount, 0);
  return { slices: [...kept, { name: OTHER, amount: rest }], all, total };
}
