import type { CoachRecommendation } from "@/types/analytics";
import Card from "@/components/ui/Card";

interface CoachInsightProps {
  // Highest-priority recommendation already computed by
  // lib/analytics/coach.ts (analytics.recommendations[0]) — never
  // recomputed or re-ranked here. The full, dismissible list still lives in
  // the Coach section further down the page (see components/coach/
  // RecommendationsList.tsx); this is a read-only glance at just the top one.
  topRecommendation: CoachRecommendation | null;
  // Only shown when there's no history at all — a brand-new account isn't
  // "on track," it just hasn't started, so the positive-state copy below is
  // deliberately not used for that case.
  hasHistory: boolean;
  onGoToInsights: () => void;
}

// PART 5: one focused card, never the full recommendation list. A
// meaningful positive state replaces an empty card once there's enough
// history for the coach algorithm to have actually looked and found
// nothing to flag.
export default function CoachInsight({ topRecommendation, hasHistory, onGoToInsights }: CoachInsightProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-label">Coach insight</h3>
        <button type="button" onClick={onGoToInsights} className="text-xs font-semibold text-accent hover:underline">
          View Coach →
        </button>
      </div>

      {topRecommendation ? (
        <div>
          <p className="text-card-title text-text-primary">{topRecommendation.message}</p>
          <p className="mt-1 text-sm text-text-secondary">{topRecommendation.explanation}</p>
        </div>
      ) : hasHistory ? (
        <div>
          <p className="text-card-title text-text-primary">Training is on track</p>
          <p className="mt-1 text-sm text-text-secondary">Your recent volume and consistency look balanced.</p>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          Finish your first workout to start unlocking personalized recommendations.
        </p>
      )}
    </Card>
  );
}
