"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAccountBalances } from "@/lib/accounts";
import { AccountType } from "@/lib/generated/prisma/client";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalAmount = z.preprocess(
    blankToUndefined,
    z.coerce.number().finite().nonnegative().optional()
);

const saveAccountSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().trim().min(1, "Name is required"),
        type: z.enum(AccountType),
        // Checking/savings: the balance. Card/loan: the positive amount owed.
        currentBalance: z.preprocess(blankToUndefined, z.coerce.number().finite().optional()),
        apr: optionalAmount,
        creditLimit: optionalAmount,
        minPayment: optionalAmount,
        monthlyPayment: z.preprocess(blankToUndefined, z.coerce.number().positive().optional()),
        nextPaymentDate: z.preprocess(blankToUndefined, z.coerce.date().optional()),
    })
    .refine(
        (a) => a.type !== "LOAN" || (a.monthlyPayment !== undefined && a.nextPaymentDate !== undefined),
        "Loans need a monthly payment and next payment date"
    );

export async function saveAccount(formData: FormData) {
    const parsed = saveAccountSchema.parse(Object.fromEntries(formData));
    const isCard = parsed.type === "CREDIT_CARD";
    const isLoan = parsed.type === "LOAN";

    const details = {
        name: parsed.name,
        type: parsed.type,
        apr: isCard || isLoan ? (parsed.apr ?? null) : null,
        creditLimit: isCard ? (parsed.creditLimit ?? null) : null,
        minPayment: isCard ? (parsed.minPayment ?? null) : null,
        monthlyPayment: isLoan ? parsed.monthlyPayment : null,
        nextPaymentDate: isLoan ? parsed.nextPaymentDate : null,
    };

    // A loan's balance comes from its payment schedule, so "amount owed" is
    // stored as the schedule's starting amount.
    const loanAmount =
        isLoan && parsed.currentBalance !== undefined ? Math.abs(parsed.currentBalance) : undefined;
    // Everything else: owed amounts are negative balances.
    const target =
        parsed.currentBalance === undefined || isLoan
            ? undefined
            : isCard
              ? -Math.abs(parsed.currentBalance)
              : parsed.currentBalance;

    if (!parsed.id) {
        await prisma.account.create({
            data: { ...details, loanAmount, startingBalance: target ?? 0 },
        });
    } else {
        let startingBalance: number | undefined;
        if (target !== undefined) {
            // Back out the transactions so starting + transactions = what the bank shows.
            const [account] = await getAccountBalances([parsed.id]);
            startingBalance = target - (account?.transactionTotal ?? 0);
        }
        await prisma.account.update({
            where: { id: parsed.id },
            // Leaving "amount owed" blank keeps a loan's existing amount.
            data: { ...details, loanAmount: isLoan ? loanAmount : null, startingBalance },
        });
    }

    revalidatePath("/accounts", "layout");
    revalidatePath("/finance", "layout");
    revalidatePath("/");
}
