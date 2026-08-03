import type { AnalyticsEventName, AnalyticsEventProperties } from "@/types/beta";

// Phase 9 PART 3 — deliberately the thinnest possible interface (one
// method) so swapping Supabase for a different analytics provider later
// means writing one new file, not touching any call site. See
// lib/analytics-events/useTrackEvent.ts, the only thing that should ever
// call this directly.
export interface AnalyticsEventRepository {
  track(userId: string, eventName: AnalyticsEventName, properties?: AnalyticsEventProperties): Promise<void>;
}
