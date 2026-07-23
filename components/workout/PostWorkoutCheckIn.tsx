"use client";

import { useState } from "react";
import type { Readiness } from "@/types/workout-log";

interface RatingFieldConfig {
  key: keyof Readiness;
  label: string;
  lowLabel: string;
  highLabel: string;
}

const FIELDS: RatingFieldConfig[] = [
  { key: "difficulty", label: "Workout difficulty", lowLabel: "Very easy", highLabel: "Very hard" },
  { key: "energy", label: "Energy", lowLabel: "Very low", highLabel: "Very high" },
  { key: "soreness", label: "Soreness", lowLabel: "None", highLabel: "Very sore" },
  { key: "sleepQuality", label: "Sleep quality (last night)", lowLabel: "Very poor", highLabel: "Excellent" },
  { key: "satisfaction", label: "Overall satisfaction", lowLabel: "Not satisfied", highLabel: "Very satisfied" },
];

const DEFAULT_VALUE = 5;

interface PostWorkoutCheckInProps {
  onSave: (readiness: Readiness) => void;
  onSkip: () => void;
}

export default function PostWorkoutCheckIn({ onSave, onSkip }: PostWorkoutCheckInProps) {
  const [values, setValues] = useState<Record<keyof Readiness, number | null>>({
    difficulty: DEFAULT_VALUE,
    energy: DEFAULT_VALUE,
    soreness: DEFAULT_VALUE,
    sleepQuality: DEFAULT_VALUE,
    satisfaction: DEFAULT_VALUE,
  });

  function toggleIncluded(key: keyof Readiness, included: boolean) {
    setValues((prev) => ({ ...prev, [key]: included ? DEFAULT_VALUE : null }));
  }

  function setValue(key: keyof Readiness, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">How did that feel?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Optional — rate as many or as few of these as you like. Used only to show you your own trends over time.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col divide-y divide-slate-100">
          {FIELDS.map((field) => {
            const value = values[field.key];
            const included = value !== null;
            return (
              <div key={field.key} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{field.label}</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={(e) => toggleIncluded(field.key, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-teal-600"
                    />
                    Rate this
                  </label>
                </div>

                {included && (
                  <>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={value}
                      onChange={(e) => setValue(field.key, Number(e.target.value))}
                      aria-label={field.label}
                      className="w-full accent-teal-600"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{field.lowLabel}</span>
                      <span className="font-semibold text-teal-700">{value} / 10</span>
                      <span>{field.highLabel}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          Skip check-in
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              difficulty: values.difficulty,
              energy: values.energy,
              soreness: values.soreness,
              sleepQuality: values.sleepQuality,
              satisfaction: values.satisfaction,
            })
          }
          className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Save & Finish
        </button>
      </div>
    </div>
  );
}
