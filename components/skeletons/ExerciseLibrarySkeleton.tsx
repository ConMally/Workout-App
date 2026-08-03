import { SkeletonBlock, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors ExerciseLibraryBrowser.tsx's layout (header, search + filter row,
// responsive card grid).
export default function ExerciseLibrarySkeleton() {
  return (
    <div role="status" aria-label="Loading exercise library" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonText className="w-32" />
        <SkeletonText className="w-72" />
      </div>

      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-10 w-full" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
