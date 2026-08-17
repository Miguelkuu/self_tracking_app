import { prisma } from "@/lib/db";
import { BillRecurrence } from "@/lib/generated/prisma/client";

function computeCurrentPeriod(bill: {
  recurrence: BillRecurrence;
  dueDayOfMonth: number | null;
  dueDate: Date | null;
}): { periodLabel: string; dueDate: Date } | null {
  const now = new Date();

  if (bill.recurrence === "ONE_TIME") {
    if (!bill.dueDate) return null;
    return {
      periodLabel: bill.dueDate.toISOString().slice(0, 10),
      dueDate: bill.dueDate,
    };
  }

  if (bill.recurrence === "MONTHLY") {
    const day = bill.dueDayOfMonth ?? 1;
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dueDate = new Date(year, month, Math.min(day, daysInMonth));
    const periodLabel = `${year}-${String(month + 1).padStart(2, "0")}`;
    return { periodLabel, dueDate };
  }

  if (bill.recurrence === "YEARLY") {
    const anchor = bill.dueDate ?? now;
    const year = now.getFullYear();
    const dueDate = new Date(year, anchor.getMonth(), anchor.getDate());
    return { periodLabel: String(year), dueDate };
  }

  // WEEKLY
  const anchor = bill.dueDate ?? now;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceAnchor = Math.floor((now.getTime() - anchor.getTime()) / msPerWeek);
  const dueDate = new Date(anchor.getTime() + weeksSinceAnchor * msPerWeek);
  return { periodLabel: dueDate.toISOString().slice(0, 10), dueDate };
}

export async function ensureUpcomingBillPayments() {
  const bills = await prisma.bill.findMany({ where: { archived: false } });

  for (const bill of bills) {
    const period = computeCurrentPeriod(bill);
    if (!period) continue;

    await prisma.billPayment.upsert({
      where: {
        billId_periodLabel: { billId: bill.id, periodLabel: period.periodLabel },
      },
      update: {},
      create: {
        billId: bill.id,
        periodLabel: period.periodLabel,
        dueDate: period.dueDate,
        amount: bill.amount ?? 0,
      },
    });
  }
}
