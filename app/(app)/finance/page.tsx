import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAccountBalances } from "@/lib/accounts";
import { AddTransactionDialog } from "@/components/finance/add-transaction-dialog";
import { TransactionList } from "@/components/finance/transaction-list";

export default async function FinancePage() {
  const [accounts, balances, categories, transactions] = await Promise.all([
    prisma.account.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
    }),
    getAccountBalances(),
    prisma.category.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      include: { account: true, category: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance</h1>
        <AddTransactionDialog accounts={accounts} categories={categories} />
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <Link href="/finance/accounts" className="underline text-muted-foreground">
          Manage accounts
        </Link>
        <Link href="/finance/categories" className="underline text-muted-foreground">
          Manage categories
        </Link>
        <Link href="/finance/import" className="underline text-muted-foreground">
          Import CSV
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground">
          Create an account first on the{" "}
          <Link href="/finance/accounts" className="underline">
            Accounts
          </Link>{" "}
          page before adding transactions.
        </p>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="rounded-md border p-3 transition-colors hover:bg-muted/30"
            >
              <p className="text-sm text-muted-foreground">{account.name}</p>
              <p className="text-xl font-bold">${account.balance.toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}

      <TransactionList transactions={transactions} />
    </div>
  );
}
