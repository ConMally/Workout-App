import type { NextRecommendation } from "@/types/dashboard";

interface RecommendationCardProps {
  recommendation: NextRecommendation;
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-800">Next recommendation</h3>
      <p className="mt-2 text-sm font-medium text-teal-900">{recommendation.message}</p>
    </div>
  );
}
