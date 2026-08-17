"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createAccountSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    startingBalance: z.coerce.number().finite(),
});

export async function createAccount(formData: FormData) {
    const parsed = createAccountSchema.parse({
        name: formData.get("name"),
        startingBalance: formData.get("startingBalance"),
    });

    await prisma.account.create({
        data: {
            name: parsed.name,
            startingBalance: parsed.startingBalance,
        },
    });

    revalidatePath("/finance/accounts");
    revalidatePath("/finance");
}