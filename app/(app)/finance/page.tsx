import Link from "next/link";
import { prisma } from "@/lib/db";
import { AddTransactionDialog } from "@/components/finance/add-transaction-dialog";

export default async function FinancePage() {
  const [accounts, categories, transactions] = await Promise.all([
    prisma.account.findMany({
      where: { archived: false },
      include: { transactions: true },
      orderBy: { createdAt: "asc" },
    }),
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
          {accounts.map((account) => {
            const balance = account.transactions.reduce((total, t) => {
              const amount = Number(t.amount);
              return t.kind === "INCOME" ? total + amount : total - amount;
            }, Number(account.startingBalance));

            return (
              <div key={account.id} className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">{account.name}</p>
                <p className="text-xl font-bold">${balance.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-muted-foreground">No transactions yet.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.account.name}
                  {t.category ? ` · ${t.category.name}` : ""} ·{" "}
                  {t.date.toLocaleDateString()}
                </p>
              </div>
              <span
                className={
                  t.kind === "INCOME"
                    ? "font-medium text-green-600"
                    : "font-medium text-red-600"
                }
              >
                {t.kind === "INCOME" ? "+" : "-"}${Number(t.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
