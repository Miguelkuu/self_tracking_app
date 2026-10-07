"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleAssignmentDone } from "@/app/(app)/school/actions";
import { cn } from "@/lib/utils";

export type CalendarAssignment = {
  id: string;
  title: string;
  subject: string;
  color: string; // the class's color
  type: string;
  dueDate: string; // ISO
  done: boolean;
};

export type CalendarClass = {
  id: string;
  title: string;
  location: string | null;
  color: string | null;
  start: string; // ISO
  end: string;
  allDay: boolean;
};

const MAX_DOTS = 4;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Date-only values are stored as UTC midnight; anything else is a real moment
// shown in the browser's own timezone.
function isDateOnly(iso: string) {
  const d = new Date(iso);
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

function dayKey(iso: string, allDay = false) {
  const d = new Date(iso);
  return allDay || isDateOnly(iso)
    ? `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
    : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// "twoWeeks": this week + next. "month": a month grid (Sunday-start weeks).
function visibleDays(view: "twoWeeks" | "month", today: Date, monthOffset: number) {
  if (view === "twoWeeks") {
    const sunday = addDays(today, -today.getDay());
    return Array.from({ length: 14 }, (_, i) => addDays(sunday, i));
  }
  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const start = addDays(first, -first.getDay());
  const count = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// Days depend on the browser's timezone, which the server doesn't know, so
// the grid renders only in the browser.
const subscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false);

export function SchoolCalendar({
  assignments,
  classes,
  view = "twoWeeks",
}: {
  assignments: CalendarAssignment[];
  classes: CalendarClass[];
  view?: "twoWeeks" | "month";
}) {
  const isClient = useIsClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  // Checkbox changes shown instantly, before the server confirms.
  const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  if (!isClient) return <div className={view === "month" ? "h-96" : "h-40"} />;

  const today = new Date();
  const startOfToday = addDays(today, 0);
  const todayKey = keyOf(today);
  const days = visibleDays(view, today, monthOffset);
  const shownMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const selectedDay = selectedDate ?? startOfToday;
  const selected = keyOf(selectedDay);

  const isDone = (a: CalendarAssignment) => doneOverrides[a.id] ?? a.done;
  const assignmentsOn = (key: string) => assignments.filter((a) => dayKey(a.dueDate) === key);
  const classesOn = (key: string) =>
    classes
      .filter((c) => dayKey(c.start, c.allDay) === key)
      .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));

  function toggle(id: string, checked: boolean) {
    setDoneOverrides((prev) => ({ ...prev, [id]: checked }));
    startTransition(async () => {
      await toggleAssignmentDone(id, checked);
    });
  }

  const dayAssignments = assignmentsOn(selected);
  const dayClasses = classesOn(selected);

  return (
    <div className="space-y-4">
      {view === "month" && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m - 1)}
            aria-label="Previous month"
            className="rounded-md p-1 hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMonthOffset(0);
              setSelectedDate(null);
            }}
            className="text-xl font-semibold"
            title="Back to this month"
          >
            {shownMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m + 1)}
            aria-label="Next month"
            className="rounded-md p-1 hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = keyOf(day);
          const items = assignmentsOn(key);
          const isToday = key === todayKey;
          const outsideMonth = view === "month" && day.getMonth() !== shownMonth.getMonth();
          const isPast = day < startOfToday;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(day)}
              aria-pressed={key === selected}
              aria-label={`${day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${items.length} assignment${items.length === 1 ? "" : "s"}`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border py-1.5 text-sm transition-colors",
                view === "month" ? "min-h-16" : "min-h-14",
                key === selected ? "border-foreground bg-muted" : "hover:bg-muted/50",
                (isPast || outsideMonth) && key !== selected && "text-muted-foreground",
                outsideMonth && "border-dashed"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {day.getDate()}
              </span>
              <span className="flex flex-wrap items-center justify-center gap-0.5">
                {items.slice(0, MAX_DOTS).map((a) => (
                  <span
                    key={a.id}
                    title={`${a.title} (${a.subject})`}
                    className="h-2 w-2 rounded-full border-2"
                    style={{
                      borderColor: a.color,
                      // Done = hollow ring in the class color.
                      backgroundColor: isDone(a) ? "transparent" : a.color,
                    }}
                  />
                ))}
                {items.length > MAX_DOTS && (
                  <span className="text-[10px] leading-none text-muted-foreground">
                    +{items.length - MAX_DOTS}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>

        {dayClasses.length > 0 && (
          <ul className="space-y-1 text-sm">
            {dayClasses.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-4 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color ?? "var(--series-other)" }}
                />
                <span className="w-16 shrink-0 tabular-nums">
                  {c.allDay ? "All day" : timeOf(c.start)}
                </span>
                <span className="min-w-0 truncate">
                  {c.title}
                  {c.location ? ` · ${c.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {dayAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments due.</p>
        ) : (
          <ul className="space-y-2">
            {dayAssignments.map((a) => (
              <li key={a.id}>
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-l-4 p-3"
                  style={{ borderLeftColor: a.color }}
                >
                  <Checkbox checked={isDone(a)} onCheckedChange={(v) => toggle(a.id, v === true)} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block font-medium",
                        isDone(a) && "text-muted-foreground line-through"
                      )}
                    >
                      {a.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {a.subject}
                      {isDateOnly(a.dueDate) ? "" : ` · due ${timeOf(a.dueDate)}`}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{a.type.toLowerCase()}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
