import type { FeedbackSubmission } from "@/types/beta";

// Phase 9 PART 2. uploadScreenshot returns a storage path (never a public
// URL — the bucket is private, see migration 0011), which the caller then
// passes as FeedbackSubmission#screenshotPath.
export interface FeedbackRepository {
  submitFeedback(userId: string, submission: FeedbackSubmission): Promise<void>;
  uploadScreenshot(userId: string, file: File): Promise<string>;
}
