import type { RecoveryResult, RecoveryStatus } from "@/types/analytics";

// Color is always paired with a text label and an icon glyph below — never
// the only indicator of status (see PART 11 accessibility requirement).
// Exported so components/dashboard/DashboardSpotlight.tsx's condensed
// recovery tile uses the exact same labels/icons instead of a second copy.
export const RECOVERY_STATUS_META: Record<RecoveryStatus, { label: string; icon: string; className: string }> = {
  recovered: { label: "Recovered", icon: "✅", className: "border-teal-200 bg-teal-50 text-teal-800" },
  moderate: { label: "Moderate", icon: "🟡", className: "border-amber-200 bg-amber-50 text-amber-800" },
  fatigued: { label: "Fatigued", icon: "🟠", className: "border-orange-200 bg-orange-50 text-orange-800" },
  overreaching: { label: "Overreaching", icon: "🔴", className: "border-red-200 bg-red-50 text-red-800" },
};

interface RecoveryCardProps {
  recovery: RecoveryResult;
}

export default function RecoveryCard({ recovery }: RecoveryCardProps) {
  const meta = RECOVERY_STATUS_META[recovery.status];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${meta.className}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Recovery status</h3>
      <div className="mt-2 flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {meta.icon}
        </span>
        <p className="text-lg font-bold">{meta.label}</p>
        {recovery.hasEnoughData && <span className="text-sm font-medium opacity-70">({recovery.score}/100)</span>}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-sm opacity-90">
        {recovery.reasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
