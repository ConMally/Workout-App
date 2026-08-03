import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppSettings } from "@/types/workout-log";
import type { SettingsRepository } from "../settings-repository";

type SettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

function toAppSettings(row: SettingsRow): AppSettings {
  return {
    autoStartRestTimer: row.auto_start_rest_timer,
    weightUnit: row.weight_unit,
    timerSound: row.timer_sound,
    vibration: row.vibration,
    defaultRestSeconds: row.default_rest_seconds,
    showExerciseGuideAutomatically: row.show_exercise_guide_automatically,
    darkMode: row.dark_mode,
    compactMode: row.compact_mode,
    largerText: row.larger_text,
    workoutReminders: row.workout_reminders,
    weeklySummary: row.weekly_summary,
    streakReminders: row.streak_reminders,
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
        timer_sound: settings.timerSound,
        vibration: settings.vibration,
        default_rest_seconds: settings.defaultRestSeconds,
        show_exercise_guide_automatically: settings.showExerciseGuideAutomatically,
        dark_mode: settings.darkMode,
        compact_mode: settings.compactMode,
        larger_text: settings.largerText,
        workout_reminders: settings.workoutReminders,
        weekly_summary: settings.weeklySummary,
        streak_reminders: settings.streakReminders,
      });

      if (error) throw error;
    },
  };
}
