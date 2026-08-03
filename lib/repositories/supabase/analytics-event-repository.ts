import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AnalyticsEventRepository } from "../analytics-event-repository";

export function createSupabaseAnalyticsEventRepository(client: SupabaseClient<Database>): AnalyticsEventRepository {
  return {
    async track(userId, eventName, properties = {}) {
      const { error } = await client.from("analytics_events").insert({
        user_id: userId,
        event_name: eventName,
        properties,
      });
      if (error) throw error;
    },
  };
}
