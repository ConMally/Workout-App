"use client";

import { useEffect } from "react";
import type { Tab } from "@/components/navigation/AppNavigation";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
  goTo: Tab;
}

interface OnboardingChecklistProps {
  hasGeneratedPlan: boolean;
  hasStartedWorkout: boolean;
  hasLoggedSet: boolean;
  hasViewedProgress: boolean;
  hasVisitedLibrary: boolean;
  onNavigate: (tab: Tab) => void;
  onSkip: () => void;
  onAllStepsComplete: () => void;
}

// Phase 9 PART 1 — a dismissible checklist rather than a blocking full-
// screen tour: it guides the user across five different screens (create a
// workout, start it, log a set, view progress, find the library), which
// only really makes sense as something they can return to between actions
// (see app/page.tsx: rendered at the top of the Dashboard, reachable from
// any tab via nav). "Allow skipping at any point" is the Skip link; "never
// show again after completion" is handled by app/page.tsx#handleCompleteOnboarding
// persisting profiles.onboarding_completed, triggered automatically here
// once every step is done.
export default function OnboardingChecklist({
  hasGeneratedPlan,
  hasStartedWorkout,
  hasLoggedSet,
  hasViewedProgress,
  hasVisitedLibrary,
  onNavigate,
  onSkip,
  onAllStepsComplete,
}: OnboardingChecklistProps) {
  const steps: OnboardingStep[] = [
    {
      id: "create",
      label: "Create your first workout",
      description: "Answer a few questions and we'll build you a plan.",
      done: hasGeneratedPlan,
      goTo: "plan",
    },
    {
      id: "start",
      label: "Start your first workout",
      description: "Pick a day from your plan and begin.",
      done: hasStartedWorkout,
      goTo: "plan",
    },
    {
      id: "log",
      label: "Log your first set",
      description: "Enter a weight and reps, then mark it complete.",
      done: hasLoggedSet,
      goTo: "workout",
    },
    {
      id: "progress",
      label: "View your progress",
      description: "See your streak, stats, and recent activity.",
      done: hasViewedProgress,
      goTo: "dashboard",
    },
    {
      id: "library",
      label: "Find the Exercise Library",
      description: "Browse, search, and favorite exercises.",
      done: hasVisitedLibrary,
      goTo: "exercises",
    },
  ];

  const allDone = steps.every((s) => s.done);

  useEffect(() => {
    if (allDone) onAllStepsComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="motion-safe:animate-step-in rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-6 dark:border-teal-900 dark:bg-teal-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
            Getting started
          </h2>
          <p className="mt-1 text-xs text-teal-700 dark:text-teal-400">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40"
        >
          Skip
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onNavigate(step.goTo)}
              disabled={step.done}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                step.done
                  ? "cursor-default border-transparent bg-white/60 dark:bg-slate-900/30"
                  : "border-teal-200 bg-white hover:border-teal-400 hover:shadow-sm active:scale-[0.99] dark:border-teal-800 dark:bg-slate-900 dark:hover:border-teal-600"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? "bg-teal-600 text-white" : "border border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    step.done ? "text-slate-500 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
              </span>
              {!step.done && (
                <span aria-hidden="true" className="flex-shrink-0 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  Go →
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
