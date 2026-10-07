"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { importSchoolFeedFile } from "@/app/(app)/school/actions";

export function FeedFileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      const result = await importSchoolFeedFile(await file.text());
      setMessage(
        result.ok
          ? {
              ok: true,
              text: `Loaded ${result.assignments} assignment${result.assignments === 1 ? "" : "s"} and ${result.classes} class event${result.classes === 1 ? "" : "s"}.`,
            }
          : { ok: false, text: result.error }
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? "Loading…" : "Upload .ics file"}
      </Button>
      {message && (
        <span className={message.ok ? "text-xs text-green-600" : "text-xs text-red-600"}>
          {message.text}
        </span>
      )}
    </div>
  );
}
