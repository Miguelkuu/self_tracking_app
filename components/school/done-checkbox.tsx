"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleAssignmentDone } from "@/app/(app)/school/actions";

export function DoneCheckbox({
  assignmentId,
  initialDone,
}: {
  assignmentId: string;
  initialDone: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    setDone(checked);
    startTransition(async () => {
      await toggleAssignmentDone(assignmentId, checked);
    });
  }

  return (
    <Checkbox checked={done} onCheckedChange={handleChange} disabled={isPending} />
  );
}
