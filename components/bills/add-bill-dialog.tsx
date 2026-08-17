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
import { createBill } from "@/app/(app)/bills/actions";
import type { Account } from "@/lib/generated/prisma/client";

export function AddBillDialog({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await createBill(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add bill</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bill</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Car insurance" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Input id="category" name="category" placeholder="car, rent, insurance..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select name="recurrence" defaultValue="MONTHLY">
                <SelectTrigger id="recurrence" className="w-full">
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
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dueDayOfMonth">Due day of month</Label>
              <Input
                id="dueDayOfMonth"
                name="dueDayOfMonth"
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use &quot;Due day of month&quot; for monthly bills, and &quot;Due date&quot; for
            one-time, yearly, or weekly bills.
          </p>

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="accountId">Account (optional)</Label>
              <Select name="accountId">
                <SelectTrigger id="accountId" className="w-full">
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
            <Checkbox id="autopay" name="autopay" />
            <Label htmlFor="autopay">Autopay</Label>
          </div>

          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
