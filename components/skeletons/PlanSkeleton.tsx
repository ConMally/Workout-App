import { SkeletonBlock, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors WorkoutPlanView.tsx's layout (header + action buttons, plan
// summary, a stack of day cards).
export default function PlanSkeleton() {
  return (
    <div role="status" aria-label="Loading workout plan" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <SkeletonText className="w-48" />
          <SkeletonText className="w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-9 w-28" />
        </div>
      </div>

      <SkeletonCard className="h-24" />

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
