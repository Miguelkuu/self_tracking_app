import { prisma } from "@/lib/db";
import { AccountFormDialog } from "@/components/finance/account-form-dialog";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    where: { archived: false },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <AccountFormDialog />
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground">
          No accounts yet. Add one to start tracking transactions.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="font-medium">{account.name}</span>
              <span className="text-muted-foreground">
                ${account.startingBalance.toString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
