import type { OnboardingInput } from "@/lib/schemas";

interface PreferencesStepProps {
  values: OnboardingInput;
  onChange: (updates: Partial<OnboardingInput>) => void;
}

const TEXTAREA_CLASSES =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

export default function PreferencesStep({ values, onChange }: PreferencesStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="injuries" className="text-sm font-semibold text-slate-800">
          Injuries or limitations <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="injuries"
          value={values.injuriesOrLimitations}
          onChange={(e) => onChange({ injuriesOrLimitations: e.target.value })}
          maxLength={1000}
          rows={3}
          placeholder="e.g. minor left knee soreness that flares up after running"
          className={TEXTAREA_CLASSES}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          We&apos;ll clearly flag this on your plan. This app never tries to diagnose or work
          around a specific injury — always check with a professional if you&apos;re unsure.
        </p>
      </div>

      <div>
        <label htmlFor="preferences" className="text-sm font-semibold text-slate-800">
          Exercise preferences <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="preferences"
          value={values.exercisePreferences}
          onChange={(e) => onChange({ exercisePreferences: e.target.value })}
          maxLength={1000}
          rows={3}
          placeholder="e.g. I enjoy kettlebell work and dislike running"
          className={TEXTAREA_CLASSES}
        />
      </div>
    </div>
  );
}
