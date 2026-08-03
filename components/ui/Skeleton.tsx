interface SkeletonProps {
  className?: string;
}

interface SkeletonCardProps extends SkeletonProps {
  children?: React.ReactNode;
}

// Base skeleton primitives (Phase 7 PART 1) — every per-screen skeleton in
// this app composes these three shapes. The shimmer sweep is a real
// animation (registered as --animate-shimmer in app/globals.css) but is
// only ever applied via the `motion-safe:` variant, so a
// prefers-reduced-motion user just sees a static muted block — still
// legible as "loading," no motion required (PART 2/10).
export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer motion-safe:animate-shimmer rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

export function SkeletonText({ className = "" }: SkeletonProps) {
  return <SkeletonBlock className={`h-3 rounded-full ${className}`} />;
}

export function SkeletonCircle({ className = "" }: SkeletonProps) {
  return <SkeletonBlock className={`rounded-full ${className}`} />;
}

// Standard card shell matching this app's established card style (rounded-2xl
// border, white/slate-900 surface, shadow-sm) so a skeleton occupies exactly
// the footprint its real content will, preventing layout shift once data
// arrives.
export function SkeletonCard({ className = "", children }: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}
