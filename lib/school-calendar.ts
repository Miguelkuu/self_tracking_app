import { prisma } from "@/lib/db";
import type { CalendarAssignment, CalendarClass } from "@/components/school/school-calendar";

const DAY = 24 * 60 * 60 * 1000;

// From `before` days ago to `after` days ahead.
export function daysAround(before: number, after: number): [Date, Date] {
  const now = Date.now();
  return [new Date(now - before * DAY), new Date(now + after * DAY)];
}

// Assignments and class events between two dates, with each class's color,
// shaped for the SchoolCalendar component.
export async function getCalendarData(from: Date, to: Date) {
  const [assignments, classes, subjects] = await Promise.all([
    prisma.assignment.findMany({
      where: { dueDate: { gte: from, lte: to }, subject: { archived: false } },
      include: { subject: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.classEvent.findMany({
      where: { start: { gte: from, lte: to } },
      orderBy: { start: "asc" },
    }),
    prisma.subject.findMany({ select: { name: true, color: true } }),
  ]);
  const colorOf = new Map(subjects.map((s) => [s.name, s.color]));

  return {
    assignments: assignments.map(
      (a): CalendarAssignment => ({
        id: a.id,
        title: a.title,
        subject: a.subject.name,
        color: a.subject.color,
        type: a.type,
        dueDate: a.dueDate.toISOString(),
        done: a.done,
      })
    ),
    classes: classes.map(
      (c): CalendarClass => ({
        id: c.id,
        title: c.title,
        location: c.location,
        color: (c.subject && colorOf.get(c.subject)) ?? null,
        start: c.start.toISOString(),
        end: c.end.toISOString(),
        allDay: c.allDay,
      })
    ),
  };
}
