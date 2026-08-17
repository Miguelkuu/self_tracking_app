import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AddSetForm } from "@/components/gym/add-set-form";

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, exercises] = await Promise.all([
    prisma.workoutSession.findUnique({
      where: { id },
      include: {
        sets: { include: { exercise: true }, orderBy: { setNumber: "asc" } },
      },
    }),
    prisma.exercise.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!session) notFound();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        {session.name ?? "Workout"} · {session.date.toLocaleDateString()}
      </h1>

      {session.sets.length > 0 && (
        <ul className="mb-6 space-y-2">
          {session.sets.map((set) => (
            <li
              key={set.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="font-medium">{set.exercise.name}</span>
              <span className="text-muted-foreground">
                {set.reps} reps @ {Number(set.weight)} {set.weightUnit.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {exercises.length === 0 ? (
        <p className="text-muted-foreground">
          Create an exercise first before logging sets.
        </p>
      ) : (
        <AddSetForm workoutSessionId={session.id} exercises={exercises} />
      )}
    </div>
  );
}
