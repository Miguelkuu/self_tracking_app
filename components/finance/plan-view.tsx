"use client";

import { useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { minimumPayment, monthsFromNow, simulatePayoff, type Card } from "@/lib/payoff";
import type { PlanData } from "@/lib/plan";
import { cn } from "@/lib/utils";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Used when a card's settings haven't been filled in yet.
const DEFAULT_APR = 25;
const DEFAULT_MIN = 35;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-bold",
          tone === "good" && "text-green-600",
          tone === "bad" && "text-red-600"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PlanView({ data }: { data: PlanData }) {
  const flexible = data.categories.filter((c) => c.suggestedCut > 0);
  const fixed = data.categories.filter((c) => c.suggestedCut === 0);

  const [cuts, setCuts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(flexible.map((c) => [c.name, true]))
  );
  const [useCash, setUseCash] = useState(true);
  const [cushionMonths, setCushionMonths] = useState(1);
  const [cardShare, setCardShare] = useState(80);

  const cards: Card[] = data.cards.map((c) => ({
    id: c.id,
    name: c.name,
    owed: c.owed,
    apr: c.apr ?? DEFAULT_APR,
    minFloor: c.minFloor ?? DEFAULT_MIN,
  }));
  const missingDetails = data.cards.filter((c) => c.apr === null || c.minFloor === null);
  const debt = cards.reduce((s, c) => s + c.owed, 0);
  const loanDebt = data.loans.reduce((s, l) => s + l.owed, 0);
  // When a loan's last payment is made, that money is free for the cards.
  const raises = data.loans
    .filter((l) => l.endsAfterMonth !== null)
    .map((l) => ({ afterMonth: l.endsAfterMonth!, amount: l.monthlyPayment }));

  const cutSavings = flexible.reduce((s, c) => s + (cuts[c.name] ? c.monthly * c.suggestedCut : 0), 0);
  const leftover = data.monthlyIncome - data.monthlySpending;
  const freeMonthly = Math.max(0, leftover + cutSavings);

  const cash = Math.max(0, data.checking) + Math.max(0, data.savings);
  const cushion = cushionMonths * (data.monthlySpending - cutSavings);
  const lumpSum = useCash ? Math.min(debt, Math.max(0, cash - cushion)) : 0;

  const minimumsNow = cards.reduce(
    (s, c) => s + minimumPayment(c.owed, (c.owed * c.apr) / 1200, c.minFloor),
    0
  );
  const toCards = Math.max(minimumsNow, (freeMonthly * cardShare) / 100);
  const toSavings = Math.max(0, freeMonthly - toCards);

  const baseline = simulatePayoff(cards, { monthlyBudget: 0, minimumsOnly: true });
  const plan = simulatePayoff(cards, { monthlyBudget: toCards, lumpSum, raises });

  return (
    <div className="space-y-8">
      {!data.hasTypedAccounts && (
        <p className="rounded-md border border-dashed p-3 text-sm">
          Open each account on the{" "}
          <Link href="/accounts" className="underline">
            Accounts
          </Link>{" "}
          tab and use <strong>Settings</strong> to mark it as checking, savings or credit card.
          The plan needs that to know where your cash and debt are.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your average month</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Income" value={money(data.monthlyIncome)} />
          <Stat label="Spending" value={money(data.monthlySpending)} />
          <Stat label="Left over" value={money(leftover)} tone={leftover >= 0 ? "good" : "bad"} />
          <Stat label="Checking + savings" value={money(cash)} />
          <Stat label="Credit card debt" value={money(debt)} tone={debt > 0 ? "bad" : undefined} />
          <Stat label="Loans" value={money(loanDebt)} tone={loanDebt > 0 ? "bad" : undefined} />
        </div>
        <p className="text-xs text-muted-foreground">
          Averaged over the last {data.monthsOfData.toFixed(1)} months of transactions. Transfers
          between your accounts aren&apos;t counted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Trim spending</h2>
        {flexible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flexible spending found.</p>
        ) : (
          <ul className="space-y-1">
            {flexible.map((c) => (
              <li key={c.name} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                <Checkbox
                  checked={cuts[c.name] ?? false}
                  onCheckedChange={(v) => setCuts((prev) => ({ ...prev, [c.name]: v === true }))}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(c.monthly)}/mo now · cut {Math.round(c.suggestedCut * 100)}%
                  </p>
                </div>
                <span className="shrink-0 font-medium text-green-600">
                  +{money(c.monthly * c.suggestedCut)}/mo
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm">
          Cutting these frees up <strong>{money(cutSavings)}/month</strong>, so you&apos;d have{" "}
          <strong>{money(freeMonthly)}/month</strong> to work with.
        </p>
        {fixed.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Treated as fixed: {fixed.map((c) => `${c.name} (${money(c.monthly)})`).join(", ")}
          </p>
        )}
      </section>

      {data.loans.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Loans on a schedule</h2>
          <ul className="space-y-1">
            {[...data.loans]
              .sort((a, b) => (a.endsAfterMonth ?? 9999) - (b.endsAfterMonth ?? 9999))
              .map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(l.owed)} left · {money(l.monthlyPayment)}/mo ·{" "}
                      {l.paymentsLeft === null
                        ? "payment doesn't cover interest"
                        : `${l.paymentsLeft} payment${l.paymentsLeft === 1 ? "" : "s"} left`}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-xs">
                    {l.lastPayment ? (
                      <>
                        done{" "}
                        {new Date(l.lastPayment).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                        <br />
                        <span className="text-green-600">
                          then +{money(l.monthlyPayment)}/mo {debt > 0 ? "to cards" : "to savings"}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </li>
              ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            These payments are already part of your spending, so nothing changes until a loan ends.
            Then its payment moves {debt > 0 ? "onto your credit cards" : "into savings"}.
          </p>
        </section>
      )}

      {debt > 0 ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Use savings, keep a cushion</h2>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={useCash} onCheckedChange={(v) => setUseCash(v === true)} />
              Pay part of the cards now from checking + savings
            </label>
            <div className="space-y-1">
              <label htmlFor="cushion" className="text-sm">
                Keep {cushionMonths} month{cushionMonths === 1 ? "" : "s"} of spending as an
                emergency cushion ({money(cushion)})
              </label>
              <input
                id="cushion"
                type="range"
                min={0}
                max={6}
                step={0.5}
                value={cushionMonths}
                onChange={(e) => setCushionMonths(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <p className="text-sm">
              {useCash && lumpSum > 0 ? (
                <>
                  Pay <strong>{money(lumpSum)}</strong> toward the cards today. Card interest
                  (~{Math.round(cards[0]?.apr ?? DEFAULT_APR)}% a year) costs far more than savings
                  earn.
                </>
              ) : (
                "Nothing extra to pay today with this cushion."
              )}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Split each month</h2>
            <input
              aria-label="Share of free money that goes to credit cards"
              type="range"
              min={50}
              max={100}
              step={5}
              value={cardShare}
              onChange={(e) => setCardShare(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="To credit cards / month" value={money(toCards)} />
              <Stat label="To savings / month" value={money(toSavings)} tone="good" />
            </div>
            {toCards > (freeMonthly * cardShare) / 100 + 0.5 && (
              <p className="text-xs text-red-600">
                Raised to the cards&apos; combined minimum payment ({money(minimumsNow)}). Paying
                less than the minimum adds late fees.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Result</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">This plan</p>
                <p className="text-2xl font-bold">
                  {plan.months === null
                    ? "Never"
                    : plan.months === 0
                      ? "Paid off today"
                      : `Debt-free ${monthsFromNow(plan.months)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {plan.months ?? "—"} months · {money(plan.totalInterest)} interest
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">Minimum payments only</p>
                <p className="text-2xl font-bold">
                  {baseline.months === null ? "Never" : `Debt-free ${monthsFromNow(baseline.months)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {baseline.months ?? "—"} months · {money(baseline.totalInterest)} interest
                </p>
              </div>
            </div>
            {plan.months !== null && baseline.totalInterest > plan.totalInterest && (
              <p className="text-sm">
                You&apos;d save <strong>{money(baseline.totalInterest - plan.totalInterest)}</strong>{" "}
                in interest. Afterwards, keep moving the full{" "}
                <strong>{money(freeMonthly)}/month</strong> into savings.
              </p>
            )}

            <div>
              <p className="mb-1 text-sm font-medium">Pay in this order (highest interest first)</p>
              <ol className="space-y-1">
                {[...cards]
                  .sort((a, b) => b.apr - a.apr)
                  .map((c, i) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <span>
                        {i + 1}. {c.name} · {money(c.owed)} at {c.apr}%
                      </span>
                      <span className="text-muted-foreground">
                        {plan.paidOffMonth[c.id] === undefined
                          ? "—"
                          : plan.paidOffMonth[c.id] === 0
                            ? "paid today"
                            : `paid off ${monthsFromNow(plan.paidOffMonth[c.id])}`}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Save it</h2>
          <p className="text-sm">
            No credit card debt found. Moving <strong>{money(freeMonthly)}/month</strong> into
            savings adds up to <strong>{money(freeMonthly * 12)}</strong> in a year.
          </p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Estimates: assumes no new card purchases and that your income and spending stay close to
        recent months.
        {missingDetails.length > 0 &&
          ` Using ${DEFAULT_APR}% APR / $${DEFAULT_MIN} minimum for ${missingDetails
            .map((c) => c.name)
            .join(", ")}. Set the real values in that account's Settings.`}{" "}
        Other cards (Capital One, Credit One…) and loans (Affirm, Klarna…) are only included once
        you add them as accounts.
      </p>
    </div>
  );
}
