import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getAccountBalances,
  getSpendingByCategory,
  parseRange,
  rangeStart,
  RANGES,
} from "@/lib/accounts";
import { SpendingDonut } from "@/components/finance/spending-donut";
import { RangeFilter } from "@/components/finance/range-filter";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function AccountsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const range = parseRange((await searchParams).range);
  const from = rangeStart(range);

  const accounts = await getAccountBalances();
  const [overall, perAccount] = await Promise.all([
    getSpendingByCategory({ from }),
    Promise.all(accounts.map((a) => getSpendingByCategory({ accountId: a.id, from }))),
  ]);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/accounts/plan" className="font-medium underline">
            Payoff &amp; savings plan
          </Link>
          <Link href="/finance/accounts" className="text-muted-foreground underline">
            Manage accounts
          </Link>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground">
          No accounts yet. Add one on the{" "}
          <Link href="/finance/accounts" className="underline">
            Manage accounts
          </Link>{" "}
          page.
        </p>
      ) : (
        <>
          <div>
            <p className="text-sm text-muted-foreground">Total balance</p>
            <p className="text-4xl font-bold">{money(totalBalance)}</p>
          </div>

          <RangeFilter basePath="/accounts" current={range} />

          <section className="rounded-md border p-4">
            <h2 className="mb-3 font-semibold">Spending · {RANGES[range]}</h2>
            <SpendingDonut slices={overall.slices} total={overall.total} size={220} />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            {accounts.map((account, i) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}?range=${range}`}
                className="rounded-md border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{account.name}</p>
                    <p className="text-xl font-bold">{money(account.balance)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                {account.loan ? (
                  <p className="text-sm text-muted-foreground">
                    {money(account.loan.monthlyPayment)}/month ·{" "}
                    {account.loan.paymentsLeft === null
                      ? "never paid off at this rate"
                      : account.loan.lastPayment
                        ? `${account.loan.paymentsLeft} left · done ${account.loan.lastPayment.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`
                        : "paid off"}
                  </p>
                ) : (
                  <SpendingDonut
                    slices={perAccount[i].slices}
                    total={perAccount[i].total}
                    size={130}
                  />
                )}
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
