import Link from "next/link";
import { prisma } from "@/lib/db";
import { AddExerciseDialog } from "@/components/gym/add-exercise-dialog";

export default async function ExercisesPage() {
  const [exercises, categories] = await Promise.all([
    prisma.exercise.findMany({
      where: { archived: false },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.exerciseCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <AddExerciseDialog categories={categories} />
      </div>

      {exercises.length === 0 ? (
        <p className="text-muted-foreground">No exercises yet.</p>
      ) : (
        <ul className="space-y-2">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <Link
                href={`/gym/exercises/${exercise.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50"
              >
                <span className="font-medium">{exercise.name}</span>
                {exercise.category && (
                  <span className="text-xs text-muted-foreground">
                    {exercise.category.name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
