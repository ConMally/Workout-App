export default function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-[var(--card-radius)] border border-border bg-surface p-10 text-center shadow-sm"
    >
      <div className="relative h-12 w-12" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-4 border-surface-muted" />
        <div className="absolute inset-0 motion-safe:animate-spin rounded-full border-4 border-transparent border-t-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">Building your personalized plan</p>
        <p className="mt-1 text-sm text-text-muted">This usually takes just a moment...</p>
      </div>
      <div className="mt-2 w-full max-w-sm space-y-2" aria-hidden="true">
        <div className="h-3 w-3/4 motion-safe:animate-pulse rounded-full bg-surface-muted" />
        <div className="h-3 w-full motion-safe:animate-pulse rounded-full bg-surface-muted" />
        <div className="h-3 w-5/6 motion-safe:animate-pulse rounded-full bg-surface-muted" />
      </div>
    </div>
  );
}
