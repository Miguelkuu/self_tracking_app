import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  getAccountBalances,
  getSpendingByCategory,
  parseRange,
  rangeStart,
  RANGES,
} from "@/lib/accounts";
import { SpendingDonut } from "@/components/finance/spending-donut";
import { RangeFilter } from "@/components/finance/range-filter";
import { TransactionList } from "@/components/finance/transaction-list";
import { AccountFormDialog } from "@/components/finance/account-form-dialog";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Enough for several months of imported history without an endless page.
const MAX_TRANSACTIONS = 500;

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const range = parseRange((await searchParams).range);
  const from = rangeStart(range);

  const [[account], spending, transactions] = await Promise.all([
    getAccountBalances([id]),
    getSpendingByCategory({ accountId: id, from }),
    prisma.transaction.findMany({
      where: { accountId: id, date: from ? { gte: from } : undefined },
      include: { account: true, category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: MAX_TRANSACTIONS,
    }),
  ]);

  if (!account) notFound();
  const isCard = account.type === "CREDIT_CARD";
  const loan = account.loan;
  const owes = isCard || loan !== null;

  return (
    <div className="space-y-6">
      <Link
        href={`/accounts?range=${range}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Accounts
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{account.name}</p>
          <p className="text-4xl font-bold">
            {owes ? money(Math.max(0, -account.balance)) : money(account.balance)}
          </p>
          {isCard && (
            <p className="text-sm text-muted-foreground">
              owed
              {account.creditLimit
                ? ` · ${Math.round((-account.balance / account.creditLimit) * 100)}% of ${money(account.creditLimit)} limit`
                : ""}
              {account.apr !== null ? ` · ${account.apr}% APR` : ""}
            </p>
          )}
        </div>
        <AccountFormDialog account={account} />
      </div>

      {loan && (
        <section className="space-y-2 rounded-md border p-4">
          <p className="text-sm">
            owed · {money(loan.monthlyPayment)}/month
            {loan.apr > 0 ? ` · ${loan.apr}% APR` : " · no interest"}
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label="Share of loan paid"
            aria-valuenow={Math.round((1 - loan.remaining / loan.amount) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--series-1)]"
              style={{ width: `${Math.max(0, (1 - loan.remaining / loan.amount) * 100)}%` }}
            />
          </div>
          <p className="text-sm font-medium">
            {loan.paymentsLeft === null
              ? "The payment doesn't cover the interest. This loan never gets paid off."
              : loan.paymentsLeft === 0
                ? "Paid off."
                : `${loan.paymentsLeft} payment${loan.paymentsLeft === 1 ? "" : "s"} left · next ${fmtDate(loan.nextPayment!)} · paid off ${fmtDate(loan.lastPayment!)}`}
          </p>
        </section>
      )}

      {owes && (
        <Link href="/accounts/plan" className="block rounded-md border p-3 text-sm hover:bg-muted/30">
          <span className="font-medium">How fast can I pay this off?</span>{" "}
          <span className="text-muted-foreground">Open the payoff &amp; savings plan →</span>
        </Link>
      )}

      <RangeFilter basePath={`/accounts/${id}`} current={range} />

      {!loan && (
        <section className="rounded-md border p-4">
          <h2 className="mb-3 font-semibold">Spending · {RANGES[range]}</h2>
          <SpendingDonut slices={spending.slices} total={spending.total} size={200} />
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">
          Transactions · {RANGES[range]}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {transactions.length === MAX_TRANSACTIONS
              ? `latest ${MAX_TRANSACTIONS}`
              : transactions.length}
          </span>
        </h2>
        <TransactionList transactions={transactions} showAccount={false} />
      </section>
    </div>
  );
}
