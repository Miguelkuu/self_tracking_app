import Link from "next/link";
import { prisma } from "@/lib/db";
import { ImportWizard } from "@/components/finance/import-wizard";

export default async function ImportPage() {
  const accounts = await prisma.account.findMany({
    where: { archived: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Import transactions</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Upload the Bank of America <code>ExportData.csv</code> export. Nothing is saved until
        you confirm.
      </p>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground">
          Create your accounts first on the{" "}
          <Link href="/finance/accounts" className="underline">
            Accounts
          </Link>{" "}
          page.
        </p>
      ) : (
        <ImportWizard accounts={accounts} />
      )}
    </div>
  );
}
