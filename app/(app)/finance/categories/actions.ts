"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createCategorySchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    kind: z.enum(["INCOME", "EXPENSE"]),
    color: z.string().trim().min(1).default("#64748b"),
});

export async function createCategory(formData: FormData) {
    const parsed = createCategorySchema.parse({
        name: formData.get("name"),
        kind: formData.get("kind"),
        color: formData.get("color") || undefined,
    });

    await prisma.category.create({
        data: {
            name: parsed.name,
            kind: parsed.kind,
            color: parsed.color,
        },
    });

    revalidatePath("/finance/categories");
    revalidatePath("/finance");
}
