"use client";

import { useRef, useState } from "react";
import type { AppSettings, WeightUnit } from "@/types/workout-log";

interface SettingsPanelProps {
  settings: AppSettings;
  hasActiveWorkout: boolean;
  // Export/import only ever reads and writes localStorage — there is no
  // cloud equivalent yet, so this section is hidden entirely for signed-in
  // (cloud-backed) users rather than shown disabled or silently no-op'ing.
  isLocalMode: boolean;
  onToggleAutoStart: (enabled: boolean) => void;
  onSetWeightUnit: (unit: WeightUnit) => void;
  onClearActiveWorkout: () => void;
  onExportData: () => void;
  onImportData: (file: File) => Promise<boolean>;
}

export default function SettingsPanel({
  settings,
  hasActiveWorkout,
  isLocalMode,
  onToggleAutoStart,
  onSetWeightUnit,
  onClearActiveWorkout,
  onExportData,
  onImportData,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleClearActiveWorkout() {
    if (hasActiveWorkout && !window.confirm("Discard your in-progress workout? This can't be undone.")) {
      return;
    }
    onClearActiveWorkout();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!window.confirm("Importing will overwrite your current plan, history, and settings. Continue?")) {
      return;
    }

    const success = await onImportData(file);
    setImportMessage(
      success
        ? { type: "success", text: "Data imported successfully." }
        : { type: "error", text: "That file isn't a valid export — nothing was changed." }
    );
  }

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your rest timer, units, active workout, and data.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
          <div>
            <p className="text-sm font-medium text-slate-800">Automatic rest timer</p>
            <p className="text-xs text-slate-500">Start the rest timer automatically after each completed set.</p>
          </div>
          <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.autoStartRestTimer}
              onChange={(e) => onToggleAutoStart(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-teal-600" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Preferred weight unit</p>
            <p className="text-xs text-slate-500">Shown next to weight fields while logging.</p>
          </div>
          <div className="flex flex-shrink-0 gap-1 rounded-lg border border-slate-200 p-1">
            {(["lbs", "kg"] as WeightUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onSetWeightUnit(unit)}
                aria-pressed={settings.weightUnit === unit}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  settings.weightUnit === unit ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Active workout</p>
            <p className="text-xs text-slate-500">
              {hasActiveWorkout ? "Discard your in-progress workout." : "No workout currently in progress."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearActiveWorkout}
            disabled={!hasActiveWorkout}
            className="flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-700"
          >
            Clear active workout
          </button>
        </div>

        {isLocalMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0">
            <div>
              <p className="text-sm font-medium text-slate-800">Your data</p>
              <p className="text-xs text-slate-500">Back up everything to a file, or restore from one.</p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={onExportData}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Export data
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Import data
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        )}

        {!isLocalMode && (
          <div className="py-3 last:pb-0">
            <p className="text-sm font-medium text-slate-800">Your data</p>
            <p className="text-xs text-slate-500">
              Your workout data is stored in your account and backed up automatically. Export/import is only
              available in local (signed-out) mode.
            </p>
          </div>
        )}
      </div>

      {importMessage && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
            importMessage.type === "success" ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"
          }`}
        >
          {importMessage.text}
        </p>
      )}
      </div>
    </div>
  );
}
