"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAccount } from "@/app/(app)/finance/accounts/actions";
import { loanStatus } from "@/lib/loans";

const TYPES = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT_CARD: "Credit card",
  LOAN: "Loan / pay-in-installments (Affirm, Klarna…)",
  OTHER: "Other",
};

type AccountType = keyof typeof TYPES;

export type EditableAccount = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  apr: number | null;
  creditLimit: number | null;
  minPayment: number | null;
  loan: { amount: number; monthlyPayment: number; firstPayment: Date } | null;
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function AccountFormDialog({ account }: { account?: EditableAccount }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<AccountType>(account?.type ?? "CHECKING");
  // Loan fields are controlled so the payoff preview updates while typing.
  const [loanAmount, setLoanAmount] = useState(account?.loan?.amount.toString() ?? "");
  const [monthlyPayment, setMonthlyPayment] = useState(
    account?.loan?.monthlyPayment.toString() ?? ""
  );
  const [nextPaymentDate, setNextPaymentDate] = useState(
    account?.loan?.firstPayment.toISOString().slice(0, 10) ?? ""
  );
  const [apr, setApr] = useState(account?.apr?.toString() ?? "");

  const isCard = type === "CREDIT_CARD";
  const isLoan = type === "LOAN";
  const editing = account !== undefined;

  const preview =
    isLoan && Number(loanAmount) > 0 && Number(monthlyPayment) > 0 && nextPaymentDate
      ? loanStatus({
          amount: Number(loanAmount),
          monthlyPayment: Number(monthlyPayment),
          apr: Number(apr) || 0,
          firstPayment: new Date(`${nextPaymentDate}T00:00:00Z`),
        })
      : null;

  async function handleSubmit(formData: FormData) {
    try {
      await saveAccount(formData);
      setError(null);
      setOpen(false);
    } catch {
      setError("Couldn't save. Check the values and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={editing ? <Button variant="outline" size="sm" /> : <Button />}
      >
        {editing ? "Settings" : "Add account"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Account settings" : "Add account"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={account.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={account?.name}
              placeholder={isLoan ? "Affirm – Laptop" : "Checking"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => v && setType(v as AccountType)}
              items={TYPES}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoan ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">Amount owed</Label>
                  <Input
                    id="currentBalance"
                    name="currentBalance"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyPayment">Monthly payment</Label>
                  <Input
                    id="monthlyPayment"
                    name="monthlyPayment"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextPaymentDate">Next payment date</Label>
                  <Input
                    id="nextPaymentDate"
                    name="nextPaymentDate"
                    type="date"
                    required
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apr">APR % (0 if none)</Label>
                  <Input
                    id="apr"
                    name="apr"
                    type="number"
                    step="0.01"
                    min="0"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                &quot;Amount owed&quot; is what you owe before that next payment. The balance then
                goes down by itself on each payment date.
              </p>
              {preview && (
                <p className="rounded-md bg-muted p-2 text-sm">
                  {preview.paymentsLeft === null
                    ? "This payment doesn't cover the interest, so it never gets paid off."
                    : preview.lastPayment
                      ? `${preview.paymentsLeft} payment${preview.paymentsLeft === 1 ? "" : "s"} left · paid off ${fmtDate(preview.lastPayment)}`
                      : "Already paid off."}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="currentBalance">
                {isCard ? "Amount owed right now" : "Balance right now"}
                {editing && " (optional)"}
              </Label>
              <Input
                id="currentBalance"
                name="currentBalance"
                type="number"
                step="0.01"
                placeholder={
                  editing
                    ? (isCard ? Math.abs(account.balance) : account.balance).toFixed(2)
                    : "0.00"
                }
              />
              <p className="text-xs text-muted-foreground">
                Copy this from your bank so the app matches it.
                {editing && " Leave empty to keep the current balance."}
              </p>
            </div>
          )}

          {isCard && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="apr">APR %</Label>
                <Input
                  id="apr"
                  name="apr"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={account?.apr ?? ""}
                  placeholder="24.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Limit</Label>
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={account?.creditLimit ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPayment">Min. payment</Label>
                <Input
                  id="minPayment"
                  name="minPayment"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={account?.minPayment ?? ""}
                  placeholder="35"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full">
            {editing ? "Save" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
