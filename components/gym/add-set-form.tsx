"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSet } from "@/app/(app)/gym/actions";
import type { Exercise } from "@/lib/generated/prisma/client";

export function AddSetForm({
  workoutSessionId,
  exercises,
}: {
  workoutSessionId: string;
  exercises: Exercise[];
}) {
  return (
    <form action={addSet} className="space-y-3 rounded-md border p-3">
      <input type="hidden" name="workoutSessionId" value={workoutSessionId} />
      <div className="space-y-2">
        <Label htmlFor="exerciseId">Exercise</Label>
        <Select
          name="exerciseId"
          defaultValue={exercises[0]?.id}
          items={exercises.map((exercise) => ({ value: exercise.id, label: exercise.name }))}
        >
          <SelectTrigger id="exerciseId" className="w-full">
            <SelectValue placeholder="Select exercise" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="reps">Reps</Label>
          <Input id="reps" name="reps" type="number" min="1" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input id="weight" name="weight" type="number" step="0.5" min="0" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weightUnit">Unit</Label>
          <Select name="weightUnit" defaultValue="LB" items={{ LB: "lb", KG: "kg" }}>
            <SelectTrigger id="weightUnit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LB">lb</SelectItem>
              <SelectItem value="KG">kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full">
        Add set
      </Button>
    </form>
  );
}
