import { z } from "zod";

export const GoalEnum = z.enum([
  "build_muscle",
  "lose_fat",
  "general_fitness",
  "strength",
  "endurance",
  "athletic_performance",
]);

export const ExperienceLevelEnum = z.enum(["beginner", "intermediate", "advanced"]);

export const EquipmentEnum = z.enum([
  "bodyweight_only",
  "dumbbells",
  "barbell",
  "resistance_bands",
  "kettlebells",
  "pull_up_bar",
  "cardio_machines",
  "full_gym",
]);

// What the onboarding form submits to /api/generate. All free-text fields
// have a hard length cap so a single request can't blow up token usage.
export const OnboardingInputSchema = z.object({
  goal: GoalEnum,
  experienceLevel: ExperienceLevelEnum,
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z.array(EquipmentEnum).min(1).max(10),
  sessionDurationMinutes: z.number().int().min(10).max(180),
  injuriesOrLimitations: z.string().max(1000).default(""),
  exercisePreferences: z.string().max(1000).default(""),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

const WarmupItemSchema = z.object({
  name: z.string(),
  duration: z.string(),
});

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().min(1).max(10),
  reps: z.string(),
  restSeconds: z.number().int().min(0).max(600),
  notes: z.string(),
});

const TrainingDaySchema = z.object({
  day: z.string(),
  title: z.string(),
  focus: z.string(),
  estimatedDurationMinutes: z.number().int().min(1).max(300),
  warmup: z.array(WarmupItemSchema),
  exercises: z.array(ExerciseSchema).min(1),
  cooldown: z.array(WarmupItemSchema),
});

// The strict shape the rule-based generator (lib/workout-generator.ts) must
// produce. Re-validated server-side before a plan is ever shown to a user.
export const WorkoutPlanSchema = z.object({
  summary: z.object({
    goal: z.string(),
    experienceLevel: z.string(),
    daysPerWeek: z.number().int().min(1).max(7),
    equipment: z.array(z.string()),
    sessionDurationMinutes: z.number().int().min(10).max(180),
  }),
  weeklySchedule: z.array(TrainingDaySchema).min(1).max(7),
  progressionGuidance: z.array(z.string()).min(1),
  safetyNotes: z.array(z.string()).min(1),
  // Non-null only when the user entered text in "injuries or limitations".
  // This app never tries to give medical advice or tailor exercises to a
  // specific injury — it just surfaces a clear, prominent warning instead.
  injuryWarning: z.string().nullable(),
});

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;
