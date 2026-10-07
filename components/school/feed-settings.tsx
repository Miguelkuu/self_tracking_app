import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeedFileUpload } from "@/components/school/feed-file-upload";
import {
  connectSchoolFeed,
  disconnectSchoolFeed,
  syncSchoolFeedNow,
} from "@/app/(app)/school/actions";

// The feed link contains a private token, so it's never shown back once saved.
export function FeedSettings({
  connected,
  lastSync,
  error,
}: {
  connected: boolean;
  lastSync: Date | null;
  error: string | null;
}) {
  if (!connected) {
    return (
      <form action={connectSchoolFeed} className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Connect your class calendar</p>
        <p className="text-xs text-muted-foreground">
          Paste the iCal / calendar feed link from Canvas, Blackboard or your school portal. Due
          dates become assignments here, and class times show on the dashboard calendar.
        </p>
        <div className="flex gap-2">
          <Input name="url" type="url" required placeholder="https://… .ics or webcal://…" />
          <Button type="submit">Connect</Button>
        </div>
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>or load a downloaded calendar:</span>
          <FeedFileUpload />
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
      <div>
        <p className="font-medium">Class calendar connected</p>
        <p className={error ? "text-xs text-red-600" : "text-xs text-muted-foreground"}>
          {error
            ? `Last sync failed: ${error}`
            : lastSync
              ? `Synced ${lastSync.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · updates every 30 min`
              : "Not synced yet"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FeedFileUpload />
        <form action={syncSchoolFeedNow}>
          <Button type="submit" variant="outline" size="sm">
            Sync now
          </Button>
        </form>
        <form action={disconnectSchoolFeed}>
          <Button type="submit" variant="ghost" size="sm">
            Disconnect
          </Button>
        </form>
      </div>
    </div>
  );
}
