import { SkeletonBlock, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors TemplateList.tsx's layout (header + new-template button, a grid
// of template cards).
export default function TemplatesSkeleton() {
  return (
    <div role="status" aria-label="Loading templates" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonText className="w-32" />
        <SkeletonBlock className="h-9 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
