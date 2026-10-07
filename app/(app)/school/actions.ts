"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AssignmentType, Priority } from "@/lib/generated/prisma/client";
import { applySchoolFeed, setFeedUrl, syncSchoolFeed } from "@/lib/school-feed";

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

const feedUrlSchema = z
  .string()
  .trim()
  .regex(/^(https?|webcal):\/\//i, "Paste the full calendar link (starts with https:// or webcal://)");

export async function connectSchoolFeed(formData: FormData) {
  await setFeedUrl(feedUrlSchema.parse(formData.get("url")));
  await syncSchoolFeed();
  revalidatePath("/school");
  revalidatePath("/");
}

export async function syncSchoolFeedNow() {
  await syncSchoolFeed();
  revalidatePath("/school");
  revalidatePath("/");
}

export async function disconnectSchoolFeed() {
  await setFeedUrl(null);
  revalidatePath("/school");
  revalidatePath("/");
}

export async function importSchoolFeedFile(icsText: string) {
  try {
    const result = await applySchoolFeed(z.string().min(1).parse(icsText));
    revalidatePath("/school");
    revalidatePath("/");
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Couldn't read that file",
    };
  }
}

export async function updateSubjectColor(subjectId: string, color: string) {
  await prisma.subject.update({
    where: { id: subjectId },
    data: { color: z.string().regex(/^#[0-9a-f]{6}$/i).parse(color) },
  });
  revalidatePath("/school", "layout");
  revalidatePath("/");
}
