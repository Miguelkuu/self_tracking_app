"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createExerciseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  categoryId: z.string().optional(),
});

export async function createExercise(formData: FormData) {
  const categoryId = formData.get("categoryId");

  const parsed = createExerciseSchema.parse({
    name: formData.get("name"),
    categoryId: categoryId ? categoryId : undefined,
  });

  await prisma.exercise.create({
    data: {
      name: parsed.name,
      categoryId: parsed.categoryId,
    },
  });

  revalidatePath("/gym/exercises");
}
