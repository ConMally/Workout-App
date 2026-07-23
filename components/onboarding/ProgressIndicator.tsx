interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  label: string;
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  label,
}: ProgressIndicatorProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-800">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-slate-500">{label}</span>
      </div>
      <div
        className="mt-2.5 flex gap-1.5"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Onboarding step ${currentStep} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < currentStep ? "bg-teal-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
