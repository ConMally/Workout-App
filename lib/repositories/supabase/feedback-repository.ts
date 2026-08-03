import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { FeedbackRepository } from "../feedback-repository";

const SCREENSHOT_BUCKET = "feedback-screenshots";

export function createSupabaseFeedbackRepository(client: SupabaseClient<Database>): FeedbackRepository {
  return {
    async submitFeedback(userId, submission) {
      const { error } = await client.from("feedback").insert({
        user_id: userId,
        type: submission.type,
        message: submission.message,
        rating: submission.rating,
        page: submission.page,
        app_version: submission.appVersion,
        user_agent: submission.userAgent,
        screenshot_path: submission.screenshotPath,
      });
      if (error) throw error;
    },

    // Namespaced by uploader id (matches migration 0011's storage RLS,
    // which reads the first path segment as the owning user).
    async uploadScreenshot(userId, file) {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await client.storage.from(SCREENSHOT_BUCKET).upload(path, file);
      if (error) throw error;
      return path;
    },
  };
}
