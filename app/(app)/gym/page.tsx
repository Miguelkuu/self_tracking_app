import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { startWorkoutSession } from "@/app/(app)/gym/actions";

export default async function GymPage() {
  const sessions = await prisma.workoutSession.findMany({
    include: { sets: true },
    orderBy: { date: "desc" },
    take: 20,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gym</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/gym/exercises">Exercises</Link>} />
          <form action={startWorkoutSession}>
            <Button type="submit">Start workout</Button>
          </form>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No workouts logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/gym/sessions/${session.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50"
              >
                <span className="font-medium">
                  {session.name ?? "Workout"} · {session.date.toLocaleDateString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {session.sets.length} sets
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
