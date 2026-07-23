"use client";

import { useState, type FormEvent } from "react";
import { OnboardingInputSchema, type OnboardingInput } from "@/lib/schemas";
import ProgressIndicator from "./onboarding/ProgressIndicator";
import GoalStep from "./onboarding/GoalStep";
import TrainingStep from "./onboarding/TrainingStep";
import PreferencesStep from "./onboarding/PreferencesStep";

export type OnboardingFormValues = OnboardingInput;

interface OnboardingFormProps {
  initialValues: OnboardingFormValues;
  onSubmit: (values: OnboardingFormValues) => void;
}

const TOTAL_STEPS = 3;

// Per-step schemas built from the same OnboardingInputSchema used server-side
// — picking a subset of fields still validates those fields with the exact
// same rules (length caps, ranges, etc.), so nothing here duplicates or
// drifts from the canonical validation in lib/schemas.ts.
const STEP_META = [
  {
    label: "Goal & experience",
    schema: OnboardingInputSchema.pick({ goal: true, experienceLevel: true }),
  },
  {
    label: "Training details",
    schema: OnboardingInputSchema.pick({
      daysPerWeek: true,
      sessionDurationMinutes: true,
      equipment: true,
    }),
  },
  {
    label: "Injuries & preferences",
    schema: OnboardingInputSchema.pick({
      injuriesOrLimitations: true,
      exercisePreferences: true,
    }),
  },
];

export default function OnboardingForm({ initialValues, onSubmit }: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<OnboardingFormValues>(initialValues);
  const [stepError, setStepError] = useState<string | null>(null);

  function updateValues(updates: Partial<OnboardingFormValues>) {
    setValues((prev) => ({ ...prev, ...updates }));
  }

  function handleBack() {
    setStepError(null);
    setStep((prev) => Math.max(1, prev - 1));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentStepSchema = STEP_META[step - 1].schema;
    const stepResult = currentStepSchema.safeParse(values);
    if (!stepResult.success) {
      setStepError(
        stepResult.error.issues[0]?.message ?? "Please check your answers and try again."
      );
      return;
    }
    setStepError(null);

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }

    // Final step — validate the complete input before submitting, same as before.
    const fullResult = OnboardingInputSchema.safeParse(values);
    if (!fullResult.success) {
      setStepError(
        fullResult.error.issues[0]?.message ?? "Please check your answers and try again."
      );
      return;
    }
    onSubmit(fullResult.data);
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <ProgressIndicator
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        label={STEP_META[step - 1].label}
      />

      {stepError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {stepError}
        </p>
      )}

      {/* key={step} forces a remount on every step change, which is what
          retriggers the CSS entrance animation below (respects
          prefers-reduced-motion via the motion-safe: variant). */}
      <div key={step} className="motion-safe:animate-step-in">
        {step === 1 && <GoalStep values={values} onChange={updateValues} />}
        {step === 2 && <TrainingStep values={values} onChange={updateValues} />}
        {step === 3 && <PreferencesStep values={values} onChange={updateValues} />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          {step < TOTAL_STEPS ? "Continue" : "Generate my workout plan"}
        </button>
      </div>
    </form>
  );
}
