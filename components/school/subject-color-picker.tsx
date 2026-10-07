"use client";

import { useRef, useState } from "react";
import { updateSubjectColor } from "@/app/(app)/school/actions";

// A color swatch that opens the system color picker. Saves shortly after you
// stop dragging, so it doesn't fire a request for every intermediate color.
export function SubjectColorPicker({
  subjectId,
  name,
  color,
}: {
  subjectId: string;
  name: string;
  color: string;
}) {
  const [value, setValue] = useState(color);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateSubjectColor(subjectId, next), 400);
  }

  return (
    <label
      className="relative inline-flex h-5 w-5 shrink-0 cursor-pointer rounded-full ring-1 ring-border"
      style={{ backgroundColor: value }}
      title={`Change ${name} color`}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={`${name} color`}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
