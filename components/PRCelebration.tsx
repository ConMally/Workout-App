import type { PersonalRecordEvent } from "@/types/workout-log";

const TYPE_LABEL: Record<PersonalRecordEvent["type"], string> = {
  heaviest_weight: "Heaviest weight",
  most_reps_at_weight: "Most reps at this weight",
  estimated_one_rep_max: "Estimated one-rep max",
};

interface PRCelebrationProps {
  events: PersonalRecordEvent[];
  onDismiss: () => void;
}

// Subtle by design: a static card, one shared fade-in (already used
// elsewhere in the app, respects prefers-reduced-motion), no confetti or
// repeated motion.
export default function PRCelebration({ events, onDismiss }: PRCelebrationProps) {
  if (events.length === 0) return null;

  return (
    <div className="motion-safe:animate-step-in rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-teal-900">
            New personal record{events.length > 1 ? "s" : ""}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-teal-800">
            {events.map((event, i) => (
              <li key={i}>
                <span className="font-semibold">{event.exerciseName}</span> — {TYPE_LABEL[event.type]}:{" "}
                {event.detail}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-full p-1 text-teal-600 hover:bg-teal-100"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
