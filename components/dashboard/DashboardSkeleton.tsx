import { SkeletonBlock, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors Dashboard.tsx's layout (header, today's workout, stat row, two
// 2-column card grids, recent activity, coach section) so the page doesn't
// shift once real data replaces it (PART 1: "prevent layout shift").
export default function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <SkeletonText className="w-40" />
          <SkeletonText className="w-28" />
        </div>
        <SkeletonBlock className="h-9 w-40" />
      </div>

      <SkeletonCard className="h-32" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
      </div>

      <SkeletonCard className="h-48" />
    </div>
  );
}
