import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CrashReportRepository } from "../crash-report-repository";

export function createSupabaseCrashReportRepository(client: SupabaseClient<Database>): CrashReportRepository {
  return {
    async reportCrash(userId, submission) {
      const { error } = await client.from("crash_reports").insert({
        user_id: userId,
        message: submission.message,
        stack: submission.stack,
        component_name: submission.componentName,
      });
      if (error) throw error;
    },
  };
}
