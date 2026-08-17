"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { WeightUnit } from "@/lib/generated/prisma/client";

export async function startWorkoutSession() {
  const session = await prisma.workoutSession.create({ data: {} });
  revalidatePath("/gym");
  redirect(`/gym/sessions/${session.id}`);
}

const addSetSchema = z.object({
  workoutSessionId: z.string().min(1),
  exerciseId: z.string().min(1, "Exercise is required"),
  reps: z.coerce.number().int().positive(),
  weight: z.coerce.number().nonnegative(),
  weightUnit: z.enum(WeightUnit),
});

export async function addSet(formData: FormData) {
  const parsed = addSetSchema.parse({
    workoutSessionId: formData.get("workoutSessionId"),
    exerciseId: formData.get("exerciseId"),
    reps: formData.get("reps"),
    weight: formData.get("weight"),
    weightUnit: formData.get("weightUnit"),
  });

  const setCount = await prisma.workoutSet.count({
    where: { workoutSessionId: parsed.workoutSessionId },
  });

  await prisma.workoutSet.create({
    data: {
      workoutSessionId: parsed.workoutSessionId,
      exerciseId: parsed.exerciseId,
      reps: parsed.reps,
      weight: parsed.weight,
      weightUnit: parsed.weightUnit,
      setNumber: setCount + 1,
    },
  });

  revalidatePath(`/gym/sessions/${parsed.workoutSessionId}`);
}
