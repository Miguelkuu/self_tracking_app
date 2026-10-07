"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseBofaCsv } from "@/lib/import/bofa";

export type PreviewRow = {
  importId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  kind: "INCOME" | "EXPENSE";
  bankAccount: string;
  category: string | null;
  isTransfer: boolean;
  status: "new" | "duplicate" | "skipped";
  skipReason: string | null;
};

export type PreviewResult =
  | { ok: true; rows: PreviewRow[]; bankAccounts: { name: string; accountId: string | null }[] }
  | { ok: false; error: string };

export async function previewImport(csvText: string): Promise<PreviewResult> {
  let parsed;
  try {
    parsed = parseBofaCsv(csvText);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not read file" };
  }

  const [existing, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { importId: { in: parsed.map((r) => r.importId) } },
      select: { importId: true },
    }),
    prisma.account.findMany({ where: { importName: { not: null } } }),
  ]);
  const existingIds = new Set(existing.map((t) => t.importId));

  const bankAccountNames = [...new Set(parsed.map((r) => r.bankAccount))];

  return {
    ok: true,
    bankAccounts: bankAccountNames.map((name) => ({
      name,
      accountId: accounts.find((a) => a.importName === name)?.id ?? null,
    })),
    rows: parsed.map((r) => ({
      importId: r.importId,
      date: r.date.toISOString().slice(0, 10),
      description: r.description,
      amount: r.amount,
      kind: r.kind,
      bankAccount: r.bankAccount,
      category: r.category,
      isTransfer: r.isTransfer,
      skipReason: r.skipReason,
      status: r.skipReason ? "skipped" : existingIds.has(r.importId) ? "duplicate" : "new",
    })),
  };
}

const commitSchema = z.object({
  csvText: z.string().min(1),
  // bank account name -> app account id ("" means don't import that account)
  accountMap: z.record(z.string(), z.string()),
  excludedIds: z.array(z.string()),
});

export async function commitImport(input: z.input<typeof commitSchema>) {
  const { csvText, accountMap, excludedIds } = commitSchema.parse(input);
  const excluded = new Set(excludedIds);

  const rows = parseBofaCsv(csvText).filter(
    (r) => !r.skipReason && !excluded.has(r.importId) && accountMap[r.bankAccount]
  );

  const imported = await prisma.$transaction(async (tx) => {
    // Remember the mapping so the next upload is pre-filled.
    for (const [bankName, accountId] of Object.entries(accountMap)) {
      if (!accountId) continue;
      await tx.account.updateMany({
        where: { importName: bankName, NOT: { id: accountId } },
        data: { importName: null },
      });
      await tx.account.update({ where: { id: accountId }, data: { importName: bankName } });
    }

    // Find or create each suggested category (unique per name + kind).
    const categoryIds = new Map<string, string>();
    for (const row of rows) {
      if (!row.category) continue;
      const key = `${row.kind}|${row.category}`;
      if (categoryIds.has(key)) continue;
      const category = await tx.category.upsert({
        where: { name_kind: { name: row.category, kind: row.kind } },
        update: {},
        create: { name: row.category, kind: row.kind },
      });
      categoryIds.set(key, category.id);
    }

    const result = await tx.transaction.createMany({
      data: rows.map((row) => ({
        kind: row.kind,
        amount: row.amount,
        date: row.date,
        description: row.description,
        notes: row.originalDescription,
        accountId: accountMap[row.bankAccount],
        categoryId: row.category ? categoryIds.get(`${row.kind}|${row.category}`) : undefined,
        importId: row.importId,
        isTransfer: row.isTransfer,
      })),
      // Rows already imported by an earlier upload are silently left alone.
      skipDuplicates: true,
    });
    return result.count;
  });

  revalidatePath("/finance");
  revalidatePath("/");
  return { imported };
}
