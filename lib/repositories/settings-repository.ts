import type { AppSettings } from "@/types/workout-log";

// Mirrors readSettings / writeSettings in lib/storage.ts.
export interface SettingsRepository {
  getSettings(userId: string): Promise<AppSettings | null>;
  saveSettings(userId: string, settings: AppSettings): Promise<void>;
}
