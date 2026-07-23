import type { OnboardingInput } from "@/lib/schemas";
import OptionCard from "./OptionCard";

const GOAL_OPTIONS: { value: OnboardingInput["goal"]; label: string; description: string }[] = [
  { value: "build_muscle", label: "Build muscle", description: "Add size and strength" },
  { value: "lose_fat", label: "Lose fat", description: "Burn fat, stay lean" },
  { value: "general_fitness", label: "General fitness", description: "Stay active and healthy" },
  { value: "strength", label: "Strength", description: "Lift heavier, get stronger" },
  { value: "endurance", label: "Endurance", description: "Build stamina and cardio" },
  {
    value: "athletic_performance",
    label: "Athletic performance",
    description: "Train speed and power",
  },
];

const EXPERIENCE_OPTIONS: {
  value: OnboardingInput["experienceLevel"];
  label: string;
  description: string;
}[] = [
  { value: "beginner", label: "Beginner", description: "New to structured training" },
  { value: "intermediate", label: "Intermediate", description: "6+ months training" },
  { value: "advanced", label: "Advanced", description: "2+ years training" },
];

interface GoalStepProps {
  values: OnboardingInput;
  onChange: (updates: Partial<OnboardingInput>) => void;
}

export default function GoalStep({ values, onChange }: GoalStepProps) {
  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">What&apos;s your main goal?</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GOAL_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              inputType="radio"
              name="goal"
              label={opt.label}
              description={opt.description}
              selected={values.goal === opt.value}
              onToggle={() => onChange({ goal: opt.value })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Experience level</legend>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              inputType="radio"
              name="experienceLevel"
              label={opt.label}
              description={opt.description}
              selected={values.experienceLevel === opt.value}
              onToggle={() => onChange({ experienceLevel: opt.value })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
