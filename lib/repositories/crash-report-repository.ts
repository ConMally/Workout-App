import type { CrashReportSubmission } from "@/types/beta";

// Phase 9 PART 6. userId is nullable in the signature (matches
// crash_reports.user_id) since components/ErrorBoundary.tsx can in
// principle mount before auth resolves — in practice this app has no
// signed-out screen for it to catch an error on, so userId is always
// present when this actually gets called.
export interface CrashReportRepository {
  reportCrash(userId: string | null, submission: CrashReportSubmission): Promise<void>;
}
