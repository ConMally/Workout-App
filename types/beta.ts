// Phase 9: types shared by the analytics, feedback, and crash-reporting
// systems. Kept in one file since all three are small, closely related
// "beta program" concerns — mirrors how types/dashboard.ts groups several
// small derived shapes rather than one file per type.

// ---------------------------------------------------------------------------
// Analytics (PART 3) — the canonical event-name list. Deliberately not
// enforced by a database check constraint (see migration 0011's comment)
// so adding a new event name never needs a migration; this union is the
// single source of truth application code should use instead.
// ---------------------------------------------------------------------------

export type AnalyticsEventName =
  | "workout_generated"
  | "workout_started"
  | "workout_completed"
  | "exercise_replaced"
  | "template_created"
  | "template_used"
  | "exercise_favorited"
  | "workout_edited"
  | "settings_changed"
  | "coach_recommendation_opened";

// Every value must be a small structural fact (a count, a category, a
// boolean) — never an exercise name, weight, or other workout content. See
// lib/analytics-events/useTrackEvent.ts's header comment.
export type AnalyticsEventProperties = Record<string, string | number | boolean | null>;

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  properties: AnalyticsEventProperties;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Feedback (PART 2) — bug reports, feature requests, general feedback, and
// star ratings (PART 5) all share this one shape.
// ---------------------------------------------------------------------------

export type FeedbackType = "bug" | "feature" | "general" | "rating";

export interface FeedbackSubmission {
  type: FeedbackType;
  message: string | null;
  rating: number | null;
  page: string;
  appVersion: string;
  userAgent: string;
  screenshotPath: string | null;
}

export interface FeedbackEntry extends FeedbackSubmission {
  id: string;
  userId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Crash reports (PART 6)
// ---------------------------------------------------------------------------

export interface CrashReportSubmission {
  message: string;
  stack: string | null;
  componentName: string | null;
}

export interface CrashReportEntry extends CrashReportSubmission {
  id: string;
  userId: string | null;
  createdAt: string;
}
