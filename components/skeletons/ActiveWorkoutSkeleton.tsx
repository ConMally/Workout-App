import { SkeletonBlock, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors ActiveWorkout.tsx's layout (sticky header card, nav bar, rest
// timer, focused exercise card with set rows).
export default function ActiveWorkoutSkeleton() {
  return (
    <div role="status" aria-label="Loading active workout" className="flex flex-col gap-4">
      <SkeletonCard className="h-28" />
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonCard className="h-20" />

      <SkeletonCard>
        <div className="flex flex-col gap-3">
          <SkeletonText className="w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
