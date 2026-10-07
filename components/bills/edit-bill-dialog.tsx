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
import { Checkbox } from "@/components/ui/checkbox";
import { PencilIcon } from "lucide-react";
import { updateBill } from "@/app/(app)/bills/actions";
import type { Account, Bill } from "@/lib/generated/prisma/client";

export function EditBillDialog({
  bill,
  accounts,
}: {
  bill: Bill;
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await updateBill(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label={`Edit ${bill.name}`}
      >
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit bill</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={bill.id} />

          <div className="space-y-2">
            <Label htmlFor={`name-${bill.id}`}>Name</Label>
            <Input id={`name-${bill.id}`} name="name" required defaultValue={bill.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`category-${bill.id}`}>Category (optional)</Label>
            <Input
              id={`category-${bill.id}`}
              name="category"
              placeholder="car, rent, insurance..."
              defaultValue={bill.category ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`recurrence-${bill.id}`}>Recurrence</Label>
              <Select
                name="recurrence"
                defaultValue={bill.recurrence}
                items={{
                  MONTHLY: "Monthly",
                  WEEKLY: "Weekly",
                  YEARLY: "Yearly",
                  ONE_TIME: "One time",
                }}
              >
                <SelectTrigger id={`recurrence-${bill.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="ONE_TIME">One time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`amount-${bill.id}`}>Amount</Label>
              <Input
                id={`amount-${bill.id}`}
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={bill.amount?.toString() ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`dueDayOfMonth-${bill.id}`}>Due day of month</Label>
              <Input
                id={`dueDayOfMonth-${bill.id}`}
                name="dueDayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15"
                defaultValue={bill.dueDayOfMonth ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dueDate-${bill.id}`}>Due date</Label>
              <Input
                id={`dueDate-${bill.id}`}
                name="dueDate"
                type="date"
                defaultValue={bill.dueDate ? bill.dueDate.toISOString().slice(0, 10) : ""}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use &quot;Due day of month&quot; for monthly bills, and &quot;Due date&quot; for
            one-time, yearly, or weekly bills.
          </p>

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor={`accountId-${bill.id}`}>Account (optional)</Label>
              <Select
                name="accountId"
                defaultValue={bill.accountId ?? undefined}
                items={accounts.map((account) => ({ value: account.id, label: account.name }))}
              >
                <SelectTrigger id={`accountId-${bill.id}`} className="w-full">
                  <SelectValue placeholder="No account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id={`autopay-${bill.id}`} name="autopay" defaultChecked={bill.autopay} />
            <Label htmlFor={`autopay-${bill.id}`}>Autopay</Label>
          </div>

          <Button type="submit" className="w-full">
            Save changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
