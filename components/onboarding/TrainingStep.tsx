import type { OnboardingInput } from "@/lib/schemas";
import OptionCard from "./OptionCard";
import EquipmentIcon from "../EquipmentIcon";

const EQUIPMENT_OPTIONS: { value: OnboardingInput["equipment"][number]; label: string }[] = [
  { value: "bodyweight_only", label: "Bodyweight only" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbell", label: "Barbell" },
  { value: "resistance_bands", label: "Resistance bands" },
  { value: "kettlebells", label: "Kettlebells" },
  { value: "pull_up_bar", label: "Pull-up bar" },
  { value: "cardio_machines", label: "Cardio machines" },
  { value: "full_gym", label: "Full gym access" },
];

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

interface TrainingStepProps {
  values: OnboardingInput;
  onChange: (updates: Partial<OnboardingInput>) => void;
}

export default function TrainingStep({ values, onChange }: TrainingStepProps) {
  function toggleEquipment(value: OnboardingInput["equipment"][number]) {
    const has = values.equipment.includes(value);
    onChange({
      equipment: has
        ? values.equipment.filter((item) => item !== value)
        : [...values.equipment, value],
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Training days per week</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => {
            const selected = values.daysPerWeek === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onChange({ daysPerWeek: day })}
                aria-pressed={selected}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-150 ${
                  selected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="sessionDuration" className="text-sm font-semibold text-slate-800">
            Session duration
          </label>
          <span className="text-sm font-semibold text-teal-700">
            {values.sessionDurationMinutes} minutes
          </span>
        </div>
        <input
          id="sessionDuration"
          type="range"
          min={10}
          max={180}
          step={5}
          value={values.sessionDurationMinutes}
          onChange={(e) => onChange({ sessionDurationMinutes: Number(e.target.value) })}
          className="mt-3 w-full accent-teal-600"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>10 min</span>
          <span>180 min</span>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Available equipment</legend>
        <p className="mt-1 text-xs text-slate-500">Select everything you have access to.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              inputType="checkbox"
              label={opt.label}
              icon={<EquipmentIcon type={opt.value} />}
              selected={values.equipment.includes(opt.value)}
              onToggle={() => toggleEquipment(opt.value)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
