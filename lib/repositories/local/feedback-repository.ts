import type { FeedbackRepository } from "../feedback-repository";

export function createLocalFeedbackRepository(): FeedbackRepository {
  return {
    async submitFeedback() {
      // no-op — no local feedback backend.
    },
    async uploadScreenshot() {
      throw new Error("Screenshot upload isn't available without a signed-in account.");
    },
  };
}
