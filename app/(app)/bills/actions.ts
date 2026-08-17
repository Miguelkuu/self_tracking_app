"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { BillRecurrence } from "@/lib/generated/prisma/client";

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
