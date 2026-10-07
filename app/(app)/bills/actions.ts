"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { BillRecurrence } from "@/lib/generated/prisma/client";
import { computeCurrentPeriod } from "@/lib/bills";

const createBillSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().trim().optional(),
  recurrence: z.enum(BillRecurrence),
  amount: z.coerce.number().nonnegative().optional(),
  dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dueDate: z.coerce.date().optional(),
  autopay: z.coerce.boolean().optional(),
  accountId: z.string().optional(),
});

export async function createBill(formData: FormData) {
  const category = formData.get("category");
  const amount = formData.get("amount");
  const dueDayOfMonth = formData.get("dueDayOfMonth");
  const dueDate = formData.get("dueDate");
  const accountId = formData.get("accountId");

  const parsed = createBillSchema.parse({
    name: formData.get("name"),
    category: category ? category : undefined,
    recurrence: formData.get("recurrence"),
    amount: amount ? amount : undefined,
    dueDayOfMonth: dueDayOfMonth ? dueDayOfMonth : undefined,
    dueDate: dueDate ? dueDate : undefined,
    autopay: formData.get("autopay") === "on",
    accountId: accountId ? accountId : undefined,
  });

  await prisma.bill.create({
    data: {
      name: parsed.name,
      category: parsed.category,
      recurrence: parsed.recurrence,
      amount: parsed.amount,
      dueDayOfMonth: parsed.dueDayOfMonth,
      dueDate: parsed.dueDate,
      autopay: parsed.autopay ?? false,
      accountId: parsed.accountId,
    },
  });

  revalidatePath("/bills");
  revalidatePath("/");
}

export async function toggleBillPaymentPaid(paymentId: string, paid: boolean) {
  await prisma.billPayment.update({
    where: { id: paymentId },
    data: { paid, paidDate: paid ? new Date() : null },
  });

  revalidatePath("/bills");
  revalidatePath("/");
}

const updateBillSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().trim().optional(),
  recurrence: z.enum(BillRecurrence),
  amount: z.coerce.number().nonnegative().optional(),
  dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dueDate: z.coerce.date().optional(),
  autopay: z.coerce.boolean().optional(),
  accountId: z.string().optional(),
});

export async function updateBill(formData: FormData) {
  const category = formData.get("category");
  const amount = formData.get("amount");
  const dueDayOfMonth = formData.get("dueDayOfMonth");
  const dueDate = formData.get("dueDate");
  const accountId = formData.get("accountId");

  const parsed = updateBillSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    category: category ? category : undefined,
    recurrence: formData.get("recurrence"),
    amount: amount ? amount : undefined,
    dueDayOfMonth: dueDayOfMonth ? dueDayOfMonth : undefined,
    dueDate: dueDate ? dueDate : undefined,
    autopay: formData.get("autopay") === "on",
    accountId: accountId ? accountId : undefined,
  });

  const bill = await prisma.bill.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      category: parsed.category ?? null,
      recurrence: parsed.recurrence,
      amount: parsed.amount ?? null,
      dueDayOfMonth: parsed.dueDayOfMonth ?? null,
      dueDate: parsed.dueDate ?? null,
      autopay: parsed.autopay ?? false,
      accountId: parsed.accountId ?? null,
    },
  });

  // Keep the already-generated payment for the current period in sync with
  // the edit, as long as it hasn't been marked paid yet.
  const period = computeCurrentPeriod(bill);
  if (period) {
    await prisma.billPayment.updateMany({
      where: { billId: bill.id, periodLabel: period.periodLabel, paid: false },
      data: { amount: bill.amount ?? 0, dueDate: period.dueDate },
    });
  }

  revalidatePath("/bills");
  revalidatePath("/");
}

export async function archiveBill(billId: string) {
  await prisma.bill.update({
    where: { id: billId },
    data: { archived: true },
  });

  revalidatePath("/bills");
  revalidatePath("/");
}
