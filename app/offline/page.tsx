export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        Reconnect to your network (or Tailscale) to keep using Self-Tracker.
      </p>
    </main>
  );
}
