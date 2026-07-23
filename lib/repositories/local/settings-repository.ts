import { readSettings, writeSettings } from "@/lib/storage";
import type { SettingsRepository } from "../settings-repository";

export function createLocalSettingsRepository(): SettingsRepository {
  return {
    async getSettings() {
      return readSettings();
    },
    async saveSettings(_userId, settings) {
      writeSettings(settings);
    },
  };
}
