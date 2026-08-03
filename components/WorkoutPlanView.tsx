"use client";

import { useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { Equipment } from "@/types/exercises";
import DayCard from "./DayCard";
import InjuryWarning from "./InjuryWarning";
import PlanSummary from "./PlanSummary";
import PlanEditor from "./plan/PlanEditor";
import EquipmentAdaptationDialog from "./plan/EquipmentAdaptationDialog";

type TrainingDay = WorkoutPlan["weeklySchedule"][number];

interface WorkoutPlanViewProps {
  plan: WorkoutPlan;
  availableEquipment?: Equipment[];
  onRegenerate: () => void;
  onEditPreferences: () => void;
  onStartOver: () => void;
  onStartWorkout: (dayIndex: number) => void;
  onReplaceExercise: (dayIndex: number, exerciseIndex: number, newName: string) => void;
  onSavePlanEdits: (weeklySchedule: TrainingDay[]) => void;
  onApplyEquipmentReplacements: (replacements: { exerciseName: string; newName: string }[]) => void;
  onSaveAsTemplate: () => void;
  hasActiveWorkout: boolean;
}

export default function WorkoutPlanView({
  plan,
  availableEquipment,
  onRegenerate,
  onEditPreferences,
  onStartOver,
  onStartWorkout,
  onReplaceExercise,
  onSavePlanEdits,
  onApplyEquipmentReplacements,
  onSaveAsTemplate,
  hasActiveWorkout,
}: WorkoutPlanViewProps) {
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);

  // PlanEditor fills the whole view (it can contain many days/exercises)
  // rather than living in an overlay modal like the smaller pickers below.
  if (showPlanEditor) {
    return (
      <div className="motion-safe:animate-step-in flex flex-col gap-6">
        <PlanEditor
          plan={plan}
          availableEquipment={availableEquipment}
          submitting={false}
          onSave={(weeklySchedule) => {
            onSavePlanEdits(weeklySchedule);
            setShowPlanEditor(false);
          }}
          onCancel={() => setShowPlanEditor(false)}
        />
      </div>
    );
  }

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your weekly plan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Built from your goals, equipment, and schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onStartOver}
            className="text-sm font-medium text-slate-400 transition hover:text-red-600"
          >
            Start Over
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSaveAsTemplate}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Save as Template
            </button>
            <button
              onClick={() => setShowPlanEditor(true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Edit Plan
            </button>
            <button
              onClick={() => setShowEquipmentDialog(true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Change Equipment
            </button>
            <button
              onClick={onEditPreferences}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Edit preferences
            </button>
            <button
              onClick={onRegenerate}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>

      <PlanSummary plan={plan} />

      {plan.injuryWarning && <InjuryWarning message={plan.injuryWarning} />}

      {hasActiveWorkout && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          You have a workout in progress. Finish or discard it from the Active Workout tab before
          starting another.
        </div>
      )}

      <div className="grid gap-4">
        {plan.weeklySchedule.map((day, i) => (
          <DayCard
            key={i}
            day={day}
            onStartWorkout={() => onStartWorkout(i)}
            startDisabled={hasActiveWorkout}
            availableEquipment={availableEquipment}
            onReplaceExercise={(exerciseIndex, newName) => onReplaceExercise(i, exerciseIndex, newName)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Progression guidance
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {plan.progressionGuidance.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-teal-500"
                aria-hidden="true"
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
          Safety notes
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-amber-900">
          {plan.safetyNotes.map((note, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {showEquipmentDialog && (
        <EquipmentAdaptationDialog
          plan={plan}
          onApply={(replacements) => {
            onApplyEquipmentReplacements(replacements);
            setShowEquipmentDialog(false);
          }}
          onCancel={() => setShowEquipmentDialog(false)}
        />
      )}
    </div>
  );
}
