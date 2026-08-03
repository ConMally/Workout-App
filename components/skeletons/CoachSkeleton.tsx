import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors CoachSection.tsx's layout (header, recommendations list, two
// 2-column card grids, consistency card, weekly report card).
export default function CoachSkeleton() {
  return (
    <div role="status" aria-label="Loading coach" className="flex flex-col gap-4">
      <SkeletonText className="w-24" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="h-16" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>
      <SkeletonCard className="h-32" />
    </div>
  );
}
