"use client";

import type { AppSettings, WeightUnit } from "@/types/workout-log";

interface SettingsPanelProps {
  settings: AppSettings;
  hasActiveWorkout: boolean;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onClearActiveWorkout: () => void;
}

const REST_PRESETS = [60, 90, 120, 180];

// Phase 7 PART 4: every control here is a thin, optimistic write through
// onUpdateSettings (app/page.tsx#handleUpdateSettings) straight to the
// existing SettingsRepository — no new persistence mechanism, just more
// fields on the same AppSettings row. Grouped into the four sections the
// task specifies (Units, Workout, Appearance, Notifications) plus the
// pre-existing Account/data section.
export default function SettingsPanel({ settings, hasActiveWorkout, onUpdateSettings, onClearActiveWorkout }: SettingsPanelProps) {
  function handleClearActiveWorkout() {
    if (hasActiveWorkout && !window.confirm("Discard your in-progress workout? This can't be undone.")) {
      return;
    }
    onClearActiveWorkout();
  }

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Customize units, workout behavior, appearance, and notifications.
        </p>
      </div>

      <SettingsSection title="Units">
        <ToggleRow label="Weight unit" description="Shown next to weight fields while logging.">
          <SegmentedControl
            value={settings.weightUnit}
            options={["lbs", "kg"] as WeightUnit[]}
            onChange={(unit) => onUpdateSettings({ weightUnit: unit })}
          />
        </ToggleRow>
      </SettingsSection>

      <SettingsSection title="Workout">
        <Switch
          label="Automatic rest timer"
          description="Start the rest timer automatically after each completed set."
          checked={settings.autoStartRestTimer}
          onChange={(checked) => onUpdateSettings({ autoStartRestTimer: checked })}
        />
        <Switch
          label="Timer sound"
          description="Play a short chime when the rest timer finishes."
          checked={settings.timerSound}
          onChange={(checked) => onUpdateSettings({ timerSound: checked })}
        />
        <Switch
          label="Vibration"
          description="Vibrate your device when you mark a set complete (supported devices only)."
          checked={settings.vibration}
          onChange={(checked) => onUpdateSettings({ vibration: checked })}
        />
        <ToggleRow label="Default rest duration" description="Used as the highlighted preset on the rest timer.">
          <SegmentedControl
            value={settings.defaultRestSeconds}
            options={REST_PRESETS}
            format={(s) => `${s}s`}
            onChange={(seconds) => onUpdateSettings({ defaultRestSeconds: seconds })}
          />
        </ToggleRow>
        <Switch
          label="Show exercise guide automatically"
          description="Expand instructions and coaching cues by default during a workout."
          checked={settings.showExerciseGuideAutomatically}
          onChange={(checked) => onUpdateSettings({ showExerciseGuideAutomatically: checked })}
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <Switch
          label="Dark mode"
          description="Switch the app to a dark color scheme."
          checked={settings.darkMode}
          onChange={(checked) => onUpdateSettings({ darkMode: checked })}
        />
        <Switch
          label="Compact mode"
          description="Reduce spacing to fit more on screen."
          checked={settings.compactMode}
          onChange={(checked) => onUpdateSettings({ compactMode: checked })}
        />
        <Switch
          label="Larger text"
          description="Increase text size across the app."
          checked={settings.largerText}
          onChange={(checked) => onUpdateSettings({ largerText: checked })}
        />
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        note="Preferences only for now — reminder delivery (email/push) hasn't shipped yet. Your choices are saved and will take effect automatically once it does."
      >
        <Switch
          label="Workout reminders"
          description="Get reminded on days you have a workout scheduled."
          checked={settings.workoutReminders}
          onChange={(checked) => onUpdateSettings({ workoutReminders: checked })}
        />
        <Switch
          label="Weekly summary"
          description="A recap of your training each week."
          checked={settings.weeklySummary}
          onChange={(checked) => onUpdateSettings({ weeklySummary: checked })}
        />
        <Switch
          label="Streak reminders"
          description="A nudge before your current streak would break."
          checked={settings.streakReminders}
          onChange={(checked) => onUpdateSettings({ streakReminders: checked })}
        />
      </SettingsSection>

      <SettingsSection title="Active workout">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Active workout</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasActiveWorkout ? "Discard your in-progress workout." : "No workout currently in progress."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearActiveWorkout}
            disabled={!hasActiveWorkout}
            className="flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-red-950/40"
          >
            Clear active workout
          </button>
        </div>
        <div className="py-3 last:pb-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Your data</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your workout data is stored in your account and backed up automatically.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      {note && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{note}</p>}
      <div className="mt-2 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-teal-600 dark:bg-slate-700" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T;
  options: T[];
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <div className="flex flex-shrink-0 flex-wrap gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition active:scale-95 ${
            value === option
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {format ? format(option) : option}
        </button>
      ))}
    </div>
  );
}
