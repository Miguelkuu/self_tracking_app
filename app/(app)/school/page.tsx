import Link from "next/link";
import { prisma } from "@/lib/db";
import { AddAssignmentDialog } from "@/components/school/add-assignment-dialog";
import { DoneCheckbox } from "@/components/school/done-checkbox";

export default async function SchoolPage() {
  const [subjects, assignments] = await Promise.all([
    prisma.subject.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.findMany({
      include: { subject: true },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">School</h1>
        <AddAssignmentDialog subjects={subjects} />
      </div>

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
                        overdue ? "text-xs text-red-600" : "text-xs text-muted-foreground"
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
    </div>
  );
}
