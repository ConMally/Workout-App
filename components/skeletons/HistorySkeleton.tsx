import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors WorkoutHistory.tsx's layout (header, a stack of completed-workout
// entry cards).
export default function HistorySkeleton() {
  return (
    <div role="status" aria-label="Loading history" className="flex flex-col gap-6">
      <SkeletonText className="w-32" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
