import type { Account, Category, Transaction } from "@/lib/generated/prisma/client";

type Row = Transaction & { account: Account; category: Category | null };

export function TransactionList({
  transactions,
  showAccount = true,
}: {
  transactions: Row[];
  showAccount?: boolean;
}) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground">No transactions yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{t.description}</p>
            <p className="text-xs text-muted-foreground">
              {[
                showAccount ? t.account.name : null,
                t.isTransfer ? "Transfer" : t.category?.name,
                t.date.toLocaleDateString("en-US", { timeZone: "UTC" }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span
            className={
              t.isTransfer
                ? "shrink-0 font-medium text-muted-foreground"
                : t.kind === "INCOME"
                  ? "shrink-0 font-medium text-green-600"
                  : "shrink-0 font-medium text-red-600"
            }
          >
            {t.kind === "INCOME" ? "+" : "-"}${Number(t.amount).toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}
