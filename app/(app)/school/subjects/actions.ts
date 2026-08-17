"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: z.string().trim().min(1),
});

export async function createSubject(formData: FormData) {
  const parsed = createSubjectSchema.parse({
    name: formData.get("name"),
    color: formData.get("color"),
  });

  await prisma.subject.create({ data: parsed });

  revalidatePath("/school/subjects");
  revalidatePath("/school");
}
