import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { WeightChart } from "@/components/gym/weight-chart";

export default async function ExerciseProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      sets: {
        include: { workoutSession: true },
        orderBy: { workoutSession: { date: "asc" } },
      },
    },
  });

  if (!exercise) notFound();

  const chartData = exercise.sets.map((set) => ({
    date: set.workoutSession.date.toLocaleDateString(),
    weight: Number(set.weight),
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{exercise.name}</h1>

      {chartData.length === 0 ? (
        <p className="text-muted-foreground">No sets logged for this exercise yet.</p>
      ) : (
        <WeightChart data={chartData} />
      )}
    </div>
  );
}
