import type { RecoveryResult, RecoveryStatus } from "@/types/analytics";

// Color is always paired with a text label and an icon glyph below — never
// the only indicator of status (see PART 11 accessibility requirement).
// Exported so components/dashboard/KeyMetrics.tsx's compact recovery tile
// uses the exact same labels/icons instead of a second copy.
// Only 3 semantic tones exist in the design system (accent/warning/danger)
// for 4 recovery states — moderate and fatigued share the warning tone,
// distinguished by their icon and label (never color alone, per PART 14),
// which also means every state gets dark mode for free via tokens instead
// of a fifth hand-maintained color pairing.
export const RECOVERY_STATUS_META: Record<RecoveryStatus, { label: string; icon: string; className: string }> = {
  recovered: { label: "Recovered", icon: "✅", className: "border-accent/30 bg-accent-soft text-accent" },
  moderate: { label: "Moderate", icon: "🟡", className: "border-warning/30 bg-warning-soft text-warning" },
  fatigued: { label: "Fatigued", icon: "🟠", className: "border-warning/30 bg-warning-soft text-warning" },
  overreaching: { label: "Overreaching", icon: "🔴", className: "border-danger/30 bg-danger-soft text-danger" },
};

interface RecoveryCardProps {
  recovery: RecoveryResult;
}

export default function RecoveryCard({ recovery }: RecoveryCardProps) {
  const meta = RECOVERY_STATUS_META[recovery.status];

  return (
    <div className={`rounded-[var(--card-radius)] border p-5 shadow-sm sm:p-6 ${meta.className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide opacity-80">Recovery status</h3>
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
