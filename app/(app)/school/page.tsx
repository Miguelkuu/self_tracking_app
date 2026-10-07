import Link from "next/link";
import { prisma } from "@/lib/db";
import { AddAssignmentDialog } from "@/components/school/add-assignment-dialog";
import { DoneCheckbox } from "@/components/school/done-checkbox";
import { FeedSettings } from "@/components/school/feed-settings";
import { CollapsibleSection } from "@/components/collapsible-section";
import { getFeedStatus, syncSchoolFeedIfStale } from "@/lib/school-feed";
import { daysAround, getCalendarData } from "@/lib/school-calendar";
import { SchoolCalendar } from "@/components/school/school-calendar";
import { SubjectColorPicker } from "@/components/school/subject-color-picker";

export default async function SchoolPage() {
  await syncSchoolFeedIfStale();
  const [subjects, assignments, feed, calendar] = await Promise.all([
    prisma.subject.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.findMany({
      include: { subject: true },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    }),
    getFeedStatus(),
    // A year each way, so the month arrows have data to show.
    getCalendarData(...daysAround(366, 366)),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">School</h1>
        <AddAssignmentDialog subjects={subjects} />
      </div>

      <CollapsibleSection
        title="Class calendar"
        count={feed.connected ? "connected" : undefined}
        defaultOpen={!feed.connected}
        className="mb-4"
      >
        <FeedSettings {...feed} />
      </CollapsibleSection>

      <section className="mb-6 space-y-4 rounded-lg border p-4">
        <SchoolCalendar
          view="month"
          assignments={calendar.assignments}
          classes={calendar.classes}
        />
        {subjects.length > 0 && (
          <div className="border-t pt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Classes · tap a color to change it
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {subjects.map((subject) => (
                <li
                  key={subject.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <SubjectColorPicker
                    subjectId={subject.id}
                    name={subject.name}
                    color={subject.color}
                  />
                  {subject.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <CollapsibleSection title="All assignments" count={assignments.length}>
        {subjects.length === 0 ? (
          <p className="text-muted-foreground">
            Create a{" "}
            <Link href="/school/subjects" className="underline">
              subject
            </Link>{" "}
            first before adding assignments.
          </p>
        ) : assignments.length === 0 ? (
          <p className="text-muted-foreground">No assignments yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((assignment) => {
              const overdue =
                !assignment.done && assignment.dueDate < new Date();
              return (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <DoneCheckbox
                      assignmentId={assignment.id}
                      initialDone={assignment.done}
                    />
                    <div>
                      <p
                        className={
                          assignment.done
                            ? "font-medium text-muted-foreground line-through"
                            : "font-medium"
                        }
                      >
                        {assignment.title}
                      </p>
                      <p
                        className={
                          overdue
                            ? "text-xs text-red-600"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {assignment.subject.name} · {assignment.type} · Due{" "}
                        {assignment.dueDate.toLocaleDateString()}
                        {overdue ? " (overdue)" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {assignment.priority}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  );
}
