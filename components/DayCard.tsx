"use client";

import { useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { Equipment } from "@/types/exercises";
import ReplacementPicker from "@/components/exercises/ReplacementPicker";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type TrainingDay = WorkoutPlan["weeklySchedule"][number];

interface DayCardProps {
  day: TrainingDay;
  onStartWorkout: () => void;
  startDisabled: boolean;
  availableEquipment?: Equipment[];
  onReplaceExercise: (exerciseIndex: number, newName: string) => void;
}

export default function DayCard({ day, onStartWorkout, startDisabled, availableEquipment, onReplaceExercise }: DayCardProps) {
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-eyebrow">{day.day}</span>
          <h3 className="mt-0.5 text-section-heading text-text-primary">{day.title}</h3>
          <p className="mt-1 text-supporting">{day.focus}</p>
        </div>
        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text-secondary">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          ~{day.estimatedDurationMinutes} min
        </span>
      </div>

      {day.warmup.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center gap-1.5 text-eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Warm-up
          </div>
          <ul className="mt-2 space-y-1 text-supporting">
            {day.warmup.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="flex-shrink-0 text-text-muted">{item.duration}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h4 className="text-label">Exercises</h4>
        <ul className="mt-2 divide-y divide-border">
          {day.exercises.map((exercise, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 py-3 first:pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="text-card-title text-text-primary">{exercise.name}</p>
                {exercise.notes && (
                  <p className="mt-0.5 text-xs text-text-muted">{exercise.notes}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2 text-xs">
                <span className="text-text-secondary">
                  {exercise.sets} sets · {exercise.reps} reps · {exercise.restSeconds}s rest
                </span>
                <button
                  type="button"
                  onClick={() => setReplacingIndex(i)}
                  className="rounded-full border border-border px-2.5 py-1 font-medium text-text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                >
                  Replace
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {day.cooldown.length > 0 && (
        <section className="mt-5">
          <h4 className="text-label">Cooldown</h4>
          <ul className="mt-2 space-y-1 text-supporting">
            {day.cooldown.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="flex-shrink-0 text-text-muted">{item.duration}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <Button variant="primary" onClick={onStartWorkout} disabled={startDisabled} className="w-full">
          Start Workout
        </Button>
      </div>

      {replacingIndex !== null && (
        <ReplacementPicker
          exerciseName={day.exercises[replacingIndex].name}
          availableEquipment={availableEquipment}
          excludeNames={day.exercises.map((e) => e.name)}
          onSelect={(candidate) => {
            onReplaceExercise(replacingIndex, candidate.exercise.name);
            setReplacingIndex(null);
          }}
          onCancel={() => setReplacingIndex(null)}
        />
      )}
    </Card>
  );
}
