import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  accountsHref,
  getAccountBalances,
  getSpendingByCategory,
  parseRange,
  rangeChips,
  rangeStart,
  RANGES,
  UNCATEGORIZED,
} from "@/lib/accounts";
import { SpendingDonut } from "@/components/finance/spending-donut";
import { FilterChips } from "@/components/finance/filter-chips";
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
  const query = await searchParams;
  const range = parseRange(query.range);
  const category = typeof query.category === "string" && query.category ? query.category : null;
  const from = rangeStart(range);
  const path = `/accounts/${id}`;

  const [accounts, spending, transactions] = await Promise.all([
    getAccountBalances(),
    getSpendingByCategory({ accountId: id, from, keep: category ?? undefined }),
    prisma.transaction.findMany({
      where: {
        accountId: id,
        date: from ? { gte: from } : undefined,
        ...(category === UNCATEGORIZED
          ? { categoryId: null, isTransfer: false }
          : category
            ? { category: { name: category } }
            : {}),
      },
      include: { account: true, category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: MAX_TRANSACTIONS,
    }),
  ]);

  // Archived accounts aren't in the switcher list but can still be opened.
  const account =
    accounts.find((a) => a.id === id) ?? (await getAccountBalances([id]))[0];
  if (!account) notFound();
  // Keep the chosen category visible even when this account has no spending
  // in it, so it's clear why the list is empty.
  const categoryOptions =
    category && !spending.all.some((c) => c.name === category)
      ? [...spending.all, { name: category, amount: 0 }]
      : spending.all;

  const isCard = account.type === "CREDIT_CARD";
  const loan = account.loan;
  const owes = isCard || loan !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={`/accounts?range=${range}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Accounts
        </Link>
        <nav aria-label="Switch account" className="flex gap-2 overflow-x-auto pb-1">
          {accounts.map((a) => (
            <Link
              key={a.id}
              href={accountsHref(`/accounts/${a.id}`, { range, category })}
              scroll={false}
              aria-current={a.id === id ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md border px-3 py-1.5 text-left transition-colors",
                a.id === id ? "border-foreground bg-muted" : "hover:bg-muted/50"
              )}
            >
              <span className="block max-w-40 truncate text-xs text-muted-foreground">
                {a.name}
              </span>
              <span className="block text-sm font-semibold">{money(a.balance)}</span>
            </Link>
          ))}
        </nav>
      </div>

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

      <div className="space-y-2">
        <FilterChips label="Date range" chips={rangeChips(path, range, category)} />
        {!loan && categoryOptions.length > 0 && (
          <FilterChips
            label="Category"
            chips={[
              {
                key: "all",
                label: "All categories",
                href: accountsHref(path, { range }),
                active: category === null,
              },
              ...categoryOptions.map((c) => ({
                key: c.name,
                label: c.name,
                href: accountsHref(path, { range, category: c.name === category ? null : c.name }),
                active: c.name === category,
              })),
            ]}
          />
        )}
      </div>

      {!loan && (
        <section className="rounded-md border p-4">
          <h2 className="mb-3 font-semibold">Spending · {RANGES[range]}</h2>
          <SpendingDonut
            slices={spending.slices}
            total={spending.total}
            size={200}
            selected={category}
            linkBase={accountsHref(path, { range })}
          />
        </section>
      )}

      {/* Keyed by category so picking one re-opens the list. */}
      <details key={category ?? ""} open={category !== null} className="group rounded-md border">
        <summary className="flex cursor-pointer list-none items-center justify-between p-3 font-medium hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
          <span>
            Transactions · {category ?? RANGES[range]}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {transactions.length === MAX_TRANSACTIONS
                ? `latest ${MAX_TRANSACTIONS}`
                : transactions.length}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t p-3">
          <TransactionList transactions={transactions} showAccount={false} />
        </div>
      </details>
    </div>
  );
}
