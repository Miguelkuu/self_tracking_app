import { prisma } from "@/lib/db";
import { AddSubjectDialog } from "@/components/school/add-subject-dialog";

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <AddSubjectDialog />
      </div>

      {subjects.length === 0 ? (
        <p className="text-muted-foreground">No subjects yet.</p>
      ) : (
        <ul className="space-y-2">
          {subjects.map((subject) => (
            <li
              key={subject.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <span className="font-medium">{subject.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
