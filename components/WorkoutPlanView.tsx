"use client";

import { useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { Equipment } from "@/types/exercises";
import Button from "./ui/Button";
import Card from "./ui/Card";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-page-title text-text-primary">Your weekly plan</h2>
          <p className="mt-1 text-supporting">Built from your goals, equipment, and schedule.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowEquipmentDialog(true)}>
            Change Equipment
          </Button>
          <Button variant="ghost" size="sm" onClick={onSaveAsTemplate}>
            Save as Template
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowPlanEditor(true)}>
            Edit Plan
          </Button>
          <Button variant="primary" size="sm" onClick={onRegenerate}>
            Regenerate
          </Button>
        </div>
      </div>

      <PlanSummary plan={plan} />

      {plan.injuryWarning && <InjuryWarning message={plan.injuryWarning} />}

      {hasActiveWorkout && (
        <div className="rounded-[var(--card-radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          You have a workout in progress. Finish or discard it from the Active Workout tab before
          starting another.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
        <button type="button" onClick={onEditPreferences} className="font-medium text-text-secondary underline-offset-2 transition hover:text-text-primary hover:underline">
          Edit preferences
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={onStartOver} className="font-medium text-text-secondary underline-offset-2 transition hover:text-danger hover:underline">
          Start Over
        </button>
      </div>

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

      <Card>
        <h3 className="text-label">Progression guidance</h3>
        <ul className="mt-3 space-y-2 text-body text-text-secondary">
          {plan.progressionGuidance.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="rounded-[var(--card-radius)] border border-warning/30 bg-warning-soft p-[var(--card-padding)]">
        <h3 className="text-label !text-warning">Safety notes</h3>
        <ul className="mt-3 space-y-2 text-body text-warning">
          {plan.safetyNotes.map((note, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-warning"
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
