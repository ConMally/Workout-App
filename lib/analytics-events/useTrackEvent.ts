"use client";

import { useCallback } from "react";
import { useRepositories } from "@/lib/repositories/useRepositories";
import type { AnalyticsEventName, AnalyticsEventProperties } from "@/types/beta";

// Phase 9 PART 3 — the one function every call site in this app should use
// to fire a product-usage event. Callable from any client component (same
// pattern as useRepositories itself — no prop drilling needed).
//
// Fire-and-forget by design, same as app/page.tsx#runMutation for every
// other write in this app: analytics must never surface an error to the
// user or block the action that triggered it. A failed analytics write is
// silently dropped rather than retried — losing one usage event is
// harmless, unlike losing workout data.
//
// `properties` must only ever contain small structural facts (counts,
// categories, booleans) — never exercise names, weights, or other workout
// content (see types/beta.ts#AnalyticsEventProperties and PART 3: "Do NOT
// collect personal workout data").
export function useTrackEvent() {
  const reposState = useRepositories();

  return useCallback(
    (eventName: AnalyticsEventName, properties?: AnalyticsEventProperties) => {
      if (reposState.status !== "ready") return;
      const { repositories, userId } = reposState;
      repositories.analyticsEvents.track(userId, eventName, properties).catch(() => {
        // Swallowed intentionally — see header comment.
      });
    },
    [reposState]
  );
}
