interface QuickActionsProps {
  onViewPlan: () => void;
  onViewHistory: () => void;
  onGoToInsights: () => void;
  onGoToSettings: () => void;
}

export default function QuickActions({ onViewPlan, onViewHistory, onGoToInsights, onGoToSettings }: QuickActionsProps) {
  const baseClass =
    "rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onViewPlan} className={baseClass}>
        View plan
      </button>
      <button type="button" onClick={onViewHistory} className={baseClass}>
        View history
      </button>
      <button type="button" onClick={onGoToInsights} className={baseClass}>
        Insights
      </button>
      <button type="button" onClick={onGoToSettings} className={baseClass}>
        Settings
      </button>
    </div>
  );
}
