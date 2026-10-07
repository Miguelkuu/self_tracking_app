import ical from "node-ical";
import { prisma } from "@/lib/db";
import { nextSubjectColor } from "@/lib/subject-colors";

// School calendar feed (Canvas, Blackboard, Google Calendar, ... any iCal URL).
// Due dates become Assignments, so checking them off is saved and survives
// re-syncs. Timed events (class meetings) go into ClassEvent for display.

export type FeedAssignment = {
  externalId: string;
  title: string;
  subject: string;
  dueDate: Date;
  type: "HOMEWORK" | "TEST" | "PROJECT" | "OTHER";
};

export type FeedClass = {
  uid: string;
  title: string;
  subject: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
};

const SETTING_URL = "school.icalUrl";
const SETTING_LAST_SYNC = "school.lastSync";
const SETTING_ERROR = "school.lastSyncError";
const SYNC_EVERY_MS = 30 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Due-date-ish words. Canvas marks assignments in the UID; other feeds don't,
// so titles are checked too.
const DUE_WORDS =
  /\b(due|assignment|homework|hw|quiz|exam|test|midterm|final|project|lab|essay|paper|discussion|submission|reading)\b/i;

const text = (v: unknown): string =>
  typeof v === "string" ? v : v && typeof v === "object" && "val" in v ? String(v.val) : "";

// "Essay 2 [ENG 101]" (Canvas style) -> title "Essay 2", subject "ENG 101".
function splitSubject(summary: string): { title: string; subject: string | null } {
  const match = /^(.*?)\s*\[([^\]]+)\]\s*$/.exec(summary);
  return match ? { title: match[1], subject: match[2] } : { title: summary, subject: null };
}

function assignmentType(title: string): FeedAssignment["type"] {
  if (/\b(quiz|exam|test|midterm|final)\b/i.test(title)) return "TEST";
  if (/\bproject\b/i.test(title)) return "PROJECT";
  return "HOMEWORK";
}

// node-ical builds all-day dates at local midnight; store them as UTC
// midnight like the rest of the app's date-only values.
function normalize(date: Date, allDay: boolean) {
  return allDay ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) : date;
}

export function parseSchoolFeed(icsText: string, now = new Date()) {
  const from = new Date(now.getTime() - 30 * DAY);
  const to = new Date(now.getTime() + 120 * DAY);
  const data = ical.sync.parseICS(icsText);

  const assignments: FeedAssignment[] = [];
  const classes: FeedClass[] = [];

  for (const component of Object.values(data)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component;
    if (event.status === "CANCELLED") continue;

    for (const instance of ical.expandRecurringEvent(event, { from, to })) {
      const allDay = instance.isFullDay;
      const start = normalize(instance.start, allDay);
      const end = normalize(instance.end ?? instance.start, allDay);
      const summary = text(instance.summary).trim() || "Untitled";
      const { title, subject } = splitSubject(summary);
      const categories = Array.isArray(event.categories) ? event.categories.join(", ") : "";

      const zeroLength = end.getTime() - start.getTime() <= 0;
      const isAssignment =
        /assignment/i.test(event.uid) || DUE_WORDS.test(summary) || (!allDay && zeroLength);

      if (isAssignment) {
        assignments.push({
          // One assignment per UID; a repeating "due" event gets one per date.
          externalId: instance.isRecurring ? `${event.uid}|${start.toISOString()}` : event.uid,
          title,
          subject: subject ?? (categories || "School"),
          dueDate: start,
          type: assignmentType(title),
        });
      } else {
        classes.push({
          uid: `${event.uid}|${start.toISOString()}`,
          title,
          subject: subject ?? (categories || null),
          location: text(instance.event.location).trim() || null,
          start,
          end: zeroLength ? start : end,
          allDay,
        });
      }
    }
  }
  return { assignments, classes };
}

async function getSetting(key: string) {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? null;
}

async function setSetting(key: string, value: string | null) {
  if (value === null) {
    await prisma.setting.deleteMany({ where: { key } });
  } else {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

export async function getFeedStatus() {
  const [url, lastSync, error] = await Promise.all([
    getSetting(SETTING_URL),
    getSetting(SETTING_LAST_SYNC),
    getSetting(SETTING_ERROR),
  ]);
  return { connected: url !== null, lastSync: lastSync ? new Date(lastSync) : null, error };
}

export async function setFeedUrl(url: string | null) {
  await setSetting(SETTING_URL, url);
  await setSetting(SETTING_LAST_SYNC, null);
  await setSetting(SETTING_ERROR, null);
}

// Saves a parsed feed: due dates become assignments (checkmarks untouched),
// class events are replaced. Used by both the URL sync and file uploads.
export async function applySchoolFeed(icsText: string) {
  const { assignments, classes } = parseSchoolFeed(icsText);
  if (assignments.length === 0 && classes.length === 0) {
    throw new Error("No events found in this calendar for the coming months");
  }

  const subjectNames = [
    ...new Set([
      ...assignments.map((a) => a.subject),
      ...classes.flatMap((c) => (c.subject ? [c.subject] : [])),
    ]),
  ];

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.subject.findMany({ select: { id: true, name: true, color: true } });
      const usedColors = existing.map((s) => s.color);
      const subjectIds = new Map(existing.map((s) => [s.name, s.id]));
      for (const name of subjectNames) {
        if (subjectIds.has(name)) continue;
        const color = nextSubjectColor(usedColors);
        usedColors.push(color);
        const subject = await tx.subject.create({ data: { name, color } });
        subjectIds.set(name, subject.id);
      }

      for (const a of assignments) {
        const data = { title: a.title, dueDate: a.dueDate, subjectId: subjectIds.get(a.subject)! };
        // Never touches `done`, so your checkmarks survive every sync.
        await tx.assignment.upsert({
          where: { externalId: a.externalId },
          update: data,
          create: { ...data, externalId: a.externalId, type: a.type },
        });
      }
      await tx.classEvent.deleteMany();
      await tx.classEvent.createMany({ data: classes, skipDuplicates: true });
    },
    { timeout: 30_000 }
  );

  await setSetting(SETTING_LAST_SYNC, new Date().toISOString());
  await setSetting(SETTING_ERROR, null);
  return { assignments: assignments.length, classes: classes.length };
}

export async function syncSchoolFeed() {
  const url = await getSetting(SETTING_URL);
  if (!url) return;

  try {
    // Canvas and others hand out webcal:// links; that's just https.
    const response = await fetch(url.replace(/^webcal:/i, "https:"), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
    await applySchoolFeed(await response.text());
  } catch (error) {
    await setSetting(SETTING_ERROR, error instanceof Error ? error.message : "Sync failed");
    // Record the attempt so a broken feed isn't retried on every page load.
    await setSetting(SETTING_LAST_SYNC, new Date().toISOString());
  }
}

// Called on page loads; only actually syncs every 30 minutes.
export async function syncSchoolFeedIfStale() {
  const lastSync = await getSetting(SETTING_LAST_SYNC);
  if (lastSync && Date.now() - new Date(lastSync).getTime() < SYNC_EVERY_MS) return;
  await syncSchoolFeed();
}
