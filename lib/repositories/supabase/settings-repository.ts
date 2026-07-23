import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppSettings } from "@/types/workout-log";
import type { SettingsRepository } from "../settings-repository";

type SettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

function toAppSettings(row: SettingsRow): AppSettings {
  return {
    autoStartRestTimer: row.auto_start_rest_timer,
    weightUnit: row.weight_unit,
  };
}

export function createSupabaseSettingsRepository(client: SupabaseClient<Database>): SettingsRepository {
  return {
    async getSettings(userId: string): Promise<AppSettings | null> {
      const { data, error } = await client.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? toAppSettings(data) : null;
    },

    async saveSettings(userId: string, settings: AppSettings): Promise<void> {
      const { error } = await client.from("user_settings").upsert({
        user_id: userId,
        auto_start_rest_timer: settings.autoStartRestTimer,
        weight_unit: settings.weightUnit,
      });

      if (error) throw error;
    },
  };
}
