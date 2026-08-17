"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AssignmentType, Priority } from "@/lib/generated/prisma/client";

const createAssignmentSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(AssignmentType),
  dueDate: z.coerce.date(),
  priority: z.enum(Priority),
  notes: z.string().trim().optional(),
});

export async function createAssignment(formData: FormData) {
  const notes = formData.get("notes");

  const parsed = createAssignmentSchema.parse({
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    type: formData.get("type"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
    notes: notes ? notes : undefined,
  });

  await prisma.assignment.create({ data: parsed });

  revalidatePath("/school");
  revalidatePath("/");
}

export async function toggleAssignmentDone(assignmentId: string, done: boolean) {
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { done, doneAt: done ? new Date() : null },
  });

  revalidatePath("/school");
  revalidatePath("/");
}
