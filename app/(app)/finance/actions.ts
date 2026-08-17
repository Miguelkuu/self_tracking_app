"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { TransactionKind } from "@/lib/generated/prisma/client";

const createTransactionSchema = z.object({
  kind: z.enum(TransactionKind),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().trim().min(1, "Description is required"),
  notes: z.string().trim().optional(),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().optional(),
});

export async function createTransaction(formData: FormData) {
  const categoryId = formData.get("categoryId");

  const parsed = createTransactionSchema.parse({
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    description: formData.get("description"),
    notes: formData.get("notes") || undefined,
    accountId: formData.get("accountId"),
    categoryId: categoryId ? categoryId : undefined,
  });

  await prisma.transaction.create({
    data: {
      kind: parsed.kind,
      amount: parsed.amount,
      date: parsed.date,
      description: parsed.description,
      notes: parsed.notes,
      accountId: parsed.accountId,
      categoryId: parsed.categoryId,
    },
  });

  revalidatePath("/finance");
}
