import type { OnboardingInput, WorkoutPlan } from "./schemas";

// A fully rule-based workout plan generator — no external API calls.
// Given validated onboarding input, it deterministically (with some
// randomized exercise variety) builds a complete weekly plan.
//
// IMPORTANT: this file intentionally does NOT try to reason about injuries
// or medical conditions. Doing so safely requires real judgment that a
// keyword-matching rule engine can't provide. Instead, the caller
// (app/api/generate/route.ts) surfaces a clear warning via `injuryWarning`
// whenever the user mentioned one, without attempting to modify exercise
// selection around it. See buildInjuryWarning() below.

type Goal = OnboardingInput["goal"];
type ExperienceLevel = OnboardingInput["experienceLevel"];
type Equipment = OnboardingInput["equipment"][number];
type EquipmentTier = "full_gym" | "dumbbells" | "bodyweight";

type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "quads"
  | "posterior_chain"
  | "biceps"
  | "triceps"
  | "core";

interface LibraryExercise {
  name: string;
}

interface DayTemplate {
  title: string;
  focus: string;
  // Ordered by priority. Shorter sessions use a prefix of this list, so put
  // the most important muscle groups for this day type first.
  slots: MuscleGroup[];
}

interface SetRepScheme {
  sets: number;
  reps: string;
  restSeconds: number;
}

// ---------------------------------------------------------------------------
// Exercise libraries — one per equipment tier, as required.
// ---------------------------------------------------------------------------

const EXERCISE_LIBRARY: Record<EquipmentTier, Record<MuscleGroup, LibraryExercise[]>> = {
  full_gym: {
    chest: [
      { name: "Barbell Bench Press" },
      { name: "Incline Dumbbell Press" },
      { name: "Cable Chest Fly" },
      { name: "Machine Chest Press" },
      { name: "Push-Up" },
    ],
    back: [
      { name: "Barbell Bent-Over Row" },
      { name: "Lat Pulldown" },
      { name: "Seated Cable Row" },
      { name: "Pull-Up" },
      { name: "T-Bar Row" },
    ],
    shoulders: [
      { name: "Barbell Overhead Press" },
      { name: "Dumbbell Lateral Raise" },
      { name: "Cable Face Pull" },
      { name: "Machine Shoulder Press" },
      { name: "Arnold Press" },
    ],
    quads: [
      { name: "Barbell Back Squat" },
      { name: "Leg Press" },
      { name: "Walking Lunge" },
      { name: "Leg Extension" },
      { name: "Front Squat" },
    ],
    posterior_chain: [
      { name: "Romanian Deadlift" },
      { name: "Hip Thrust" },
      { name: "Seated Leg Curl" },
      { name: "Barbell Deadlift" },
      { name: "Glute Bridge" },
    ],
    biceps: [
      { name: "Barbell Bicep Curl" },
      { name: "Dumbbell Hammer Curl" },
      { name: "Cable Curl" },
      { name: "Preacher Curl" },
      { name: "Incline Dumbbell Curl" },
    ],
    triceps: [
      { name: "Cable Tricep Pushdown" },
      { name: "Skull Crusher" },
      { name: "Dumbbell Overhead Tricep Extension" },
      { name: "Close-Grip Bench Press" },
      { name: "Tricep Dip" },
    ],
    core: [
      { name: "Cable Woodchopper" },
      { name: "Hanging Leg Raise" },
      { name: "Weighted Plank" },
      { name: "Machine Ab Crunch" },
      { name: "Russian Twist" },
    ],
  },
  dumbbells: {
    chest: [
      { name: "Dumbbell Bench Press" },
      { name: "Dumbbell Floor Press" },
      { name: "Dumbbell Fly" },
      { name: "Incline Dumbbell Press" },
      { name: "Push-Up" },
    ],
    back: [
      { name: "Single-Arm Dumbbell Row" },
      { name: "Renegade Row" },
      { name: "Dumbbell Pullover" },
      { name: "Bent-Over Dumbbell Row" },
      { name: "Dumbbell Reverse Fly" },
    ],
    shoulders: [
      { name: "Dumbbell Shoulder Press" },
      { name: "Dumbbell Lateral Raise" },
      { name: "Arnold Press" },
      { name: "Dumbbell Front Raise" },
      { name: "Dumbbell Upright Row" },
    ],
    quads: [
      { name: "Dumbbell Goblet Squat" },
      { name: "Dumbbell Walking Lunge" },
      { name: "Dumbbell Step-Up" },
      { name: "Bulgarian Split Squat" },
      { name: "Dumbbell Front Squat" },
    ],
    posterior_chain: [
      { name: "Dumbbell Romanian Deadlift" },
      { name: "Dumbbell Hip Thrust" },
      { name: "Single-Leg Dumbbell Deadlift" },
      { name: "Dumbbell Glute Bridge" },
      { name: "Dumbbell Sumo Deadlift" },
    ],
    biceps: [
      { name: "Dumbbell Bicep Curl" },
      { name: "Dumbbell Hammer Curl" },
      { name: "Incline Dumbbell Curl" },
      { name: "Concentration Curl" },
      { name: "Cross-Body Hammer Curl" },
    ],
    triceps: [
      { name: "Dumbbell Overhead Tricep Extension" },
      { name: "Dumbbell Kickback" },
      { name: "Close-Grip Dumbbell Press" },
      { name: "Dumbbell Floor Skull Crusher" },
      { name: "Tricep Dip" },
    ],
    core: [
      { name: "Dumbbell Russian Twist" },
      { name: "Weighted Plank" },
      { name: "Dumbbell Side Bend" },
      { name: "Dumbbell Sit-Up" },
      { name: "Hollow Body Hold" },
    ],
  },
  bodyweight: {
    chest: [
      { name: "Push-Up" },
      { name: "Incline Push-Up (feet elevated)" },
      { name: "Decline Push-Up (hands elevated)" },
      { name: "Wide-Grip Push-Up" },
      { name: "Diamond Push-Up" },
    ],
    back: [
      { name: "Pull-Up" },
      { name: "Inverted Row" },
      { name: "Superman Row" },
      { name: "Doorway Row" },
      { name: "Towel Row" },
    ],
    shoulders: [
      { name: "Pike Push-Up" },
      { name: "Wall Handstand Hold" },
      { name: "Arm Circles with Pause" },
      { name: "Lateral Raise Hold" },
      { name: "Wall Slide" },
    ],
    quads: [
      { name: "Bodyweight Squat" },
      { name: "Walking Lunge" },
      { name: "Bulgarian Split Squat" },
      { name: "Jump Squat" },
      { name: "Wall Sit" },
    ],
    posterior_chain: [
      { name: "Glute Bridge" },
      { name: "Single-Leg Glute Bridge" },
      { name: "Reverse Lunge" },
      { name: "Bodyweight Good Morning" },
      { name: "Donkey Kick" },
    ],
    biceps: [
      { name: "Chin-Up" },
      { name: "Slow-Negative Chin-Up" },
      { name: "Doorframe Curl" },
      { name: "Towel Isometric Curl" },
      { name: "Resistance Hold Curl" },
    ],
    triceps: [
      { name: "Tricep Dip (chair or bench)" },
      { name: "Diamond Push-Up" },
      { name: "Close-Grip Push-Up" },
      { name: "Bench Dip" },
      { name: "Pike Tricep Push-Up" },
    ],
    core: [
      { name: "Plank" },
      { name: "Bicycle Crunch" },
      { name: "Mountain Climber" },
      { name: "Hollow Body Hold" },
      { name: "Russian Twist" },
    ],
  },
};

const WARMUP_POOL: Record<EquipmentTier, { name: string; duration: string }[]> = {
  full_gym: [
    { name: "Treadmill or bike, easy pace", duration: "5 minutes" },
    { name: "Arm circles", duration: "30 seconds each direction" },
    { name: "Bodyweight squats", duration: "10 reps" },
  ],
  dumbbells: [
    { name: "Jumping jacks", duration: "1 minute" },
    { name: "Arm circles", duration: "30 seconds each direction" },
    { name: "Light dumbbell shoulder rotations", duration: "10 reps per side" },
  ],
  bodyweight: [
    { name: "Jumping jacks", duration: "1 minute" },
    { name: "Arm circles", duration: "30 seconds each direction" },
    { name: "World's greatest stretch", duration: "5 reps per side" },
  ],
};

const COOLDOWN_POOL: { name: string; duration: string }[] = [
  { name: "Standing quad stretch", duration: "30 seconds per side" },
  { name: "Chest doorway stretch", duration: "30 seconds" },
];

// ---------------------------------------------------------------------------
// Set/rep schemes by goal — the core of requirement #7.
// ---------------------------------------------------------------------------

const BASE_SCHEME_BY_GOAL: Record<Goal, SetRepScheme> = {
  build_muscle: { sets: 4, reps: "8-12", restSeconds: 75 },
  strength: { sets: 5, reps: "3-6", restSeconds: 150 },
  lose_fat: { sets: 3, reps: "12-15", restSeconds: 40 },
  general_fitness: { sets: 3, reps: "10-12", restSeconds: 60 },
  endurance: { sets: 3, reps: "15-20", restSeconds: 30 },
  athletic_performance: { sets: 4, reps: "5-8", restSeconds: 90 },
};

function getSetRepScheme(goal: Goal, experienceLevel: ExperienceLevel): SetRepScheme {
  const scheme = { ...BASE_SCHEME_BY_GOAL[goal] };

  if (experienceLevel === "beginner") {
    // Trim volume and add recovery time while form is still being learned.
    scheme.sets = Math.max(2, scheme.sets - 1);
    scheme.restSeconds += 15;
  } else if (experienceLevel === "advanced") {
    scheme.sets += 1;
  }

  return scheme;
}

const GOAL_COACHING_CUE: Record<Goal, string> = {
  build_muscle: "Focus on a slow, controlled lowering phase and stop 1-2 reps short of failure.",
  strength: "Prioritize good form over speed; rest fully between sets so each one is strong.",
  lose_fat: "Keep the pace brisk — minimize rest between sets to keep your heart rate up.",
  general_fitness: "Move through a full range of motion and keep your core braced.",
  endurance: "Keep the weight light-to-moderate and prioritize consistent pacing over max effort.",
  athletic_performance: "Emphasize speed and power on the concentric (lifting) phase.",
};

// ---------------------------------------------------------------------------
// Day templates and weekly splits — requirement #6 (3/4/5/6-day support).
// ---------------------------------------------------------------------------

const FULL_BODY: DayTemplate = {
  title: "Full Body",
  focus: "Full-body strength",
  slots: ["quads", "back", "chest", "posterior_chain", "shoulders", "core", "triceps", "biceps"],
};

const UPPER: DayTemplate = {
  title: "Upper Body",
  focus: "Chest, back, shoulders & arms",
  slots: ["chest", "back", "shoulders", "back", "chest", "triceps", "biceps", "core"],
};

const LOWER: DayTemplate = {
  title: "Lower Body",
  focus: "Quads, hamstrings, glutes & core",
  slots: ["quads", "posterior_chain", "quads", "posterior_chain", "core"],
};

const PUSH: DayTemplate = {
  title: "Push",
  focus: "Chest, shoulders & triceps",
  slots: ["chest", "shoulders", "triceps", "chest", "shoulders", "triceps"],
};

const PULL: DayTemplate = {
  title: "Pull",
  focus: "Back & biceps",
  slots: ["back", "back", "biceps", "back", "biceps", "core"],
};

const LEGS: DayTemplate = {
  title: "Legs",
  focus: "Quads, hamstrings & glutes",
  slots: ["quads", "posterior_chain", "quads", "posterior_chain", "core"],
};

function getSplitTemplates(daysPerWeek: number): DayTemplate[] {
  switch (daysPerWeek) {
    case 1:
      return [FULL_BODY];
    case 2:
      return [FULL_BODY, FULL_BODY];
    case 3:
      return [FULL_BODY, FULL_BODY, FULL_BODY];
    case 4:
      return [UPPER, LOWER, UPPER, LOWER];
    case 5:
      return [PUSH, PULL, LEGS, UPPER, LOWER];
    case 6:
      return [PUSH, PULL, LEGS, PUSH, PULL, LEGS];
    case 7:
      return [PUSH, PULL, LEGS, PUSH, PULL, LEGS, FULL_BODY];
    default:
      // daysPerWeek is validated to 1-7 upstream; this is just a safe fallback.
      return [FULL_BODY, FULL_BODY, FULL_BODY];
  }
}

// ---------------------------------------------------------------------------
// Equipment tier selection — requirement #5 (3 separate libraries).
// ---------------------------------------------------------------------------

function determineEquipmentTier(equipment: Equipment[]): EquipmentTier {
  if (equipment.includes("full_gym")) return "full_gym";
  if (equipment.includes("dumbbells")) return "dumbbells";
  return "bodyweight";
}

// ---------------------------------------------------------------------------
// Lightweight exercise-preference parsing.
//
// This is a heuristic, not real language understanding: it looks for a
// small set of "like"/"dislike" marker words and treats the words around
// them as exercise keywords. It's good enough to notice "I dislike running"
// or "I love kettlebells", and deliberately fails safe — if nothing matches,
// every exercise stays eligible.
// ---------------------------------------------------------------------------

const MARKER_PATTERN =
  /\b(likes?|liked|loves?|loved|enjoys?|enjoyed|prefers?|preferred|dislikes?|disliked|hates?|hated|avoids?|avoided|avoiding)\b/i;

const NEGATIVE_MARKER = /^(dislikes?|disliked|hates?|hated|avoids?|avoided|avoiding)$/i;

const STOP_WORDS = new Set([
  "and", "but", "the", "a", "an", "to", "of", "for", "with", "without", "not",
  "really", "very", "just", "also", "some", "much", "lot", "lots",
  "i", "my", "me", "im", "dont", "cant", "no", "doing", "do", "would", "rather", "instead",
  "work", "workout", "workouts", "exercise", "exercises", "training", "session", "sessions",
  "stuff", "things", "like", "likes", "liked", "love", "loves", "loved", "enjoy", "enjoys",
  "enjoyed", "prefer", "prefers", "preferred", "dislike", "dislikes", "disliked", "hate", "hates",
  "hated", "avoid", "avoids", "avoided", "avoiding",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

interface ParsedPreferences {
  liked: string[];
  disliked: string[];
}

function parsePreferences(text: string): ParsedPreferences {
  if (!text.trim()) return { liked: [], disliked: [] };

  const fragments = text
    .toLowerCase()
    .split(new RegExp(`(?=${MARKER_PATTERN.source})`, "i"))
    .filter(Boolean);

  const liked = new Set<string>();
  const disliked = new Set<string>();

  for (const fragment of fragments) {
    const markerMatch = fragment.match(MARKER_PATTERN);
    const isNegative = markerMatch ? NEGATIVE_MARKER.test(markerMatch[1]) : false;
    for (const keyword of extractKeywords(fragment)) {
      (isNegative ? disliked : liked).add(keyword);
    }
  }

  // No marker words at all (e.g. just "squats, kettlebells, hiking") — treat
  // the whole thing as a list of things the user likes.
  if (liked.size === 0 && disliked.size === 0) {
    for (const keyword of extractKeywords(text)) liked.add(keyword);
  }

  return { liked: Array.from(liked), disliked: Array.from(disliked) };
}

function normalizeWord(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function exerciseNameWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .map(normalizeWord)
  );
}

function matchesKeywords(name: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const nameWords = exerciseNameWords(name);
  return keywords.some((keyword) => nameWords.has(normalizeWord(keyword)));
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function rankExercises(pool: LibraryExercise[], preferences: ParsedPreferences): LibraryExercise[] {
  const notDisliked = pool.filter((ex) => !matchesKeywords(ex.name, preferences.disliked));
  // Never let disliked-exercise filtering leave a muscle group with nothing
  // to pick from — fall back to the full pool rather than skip the group.
  const usablePool = notDisliked.length > 0 ? notDisliked : pool;

  const shuffled = shuffle(usablePool);
  const liked = shuffled.filter((ex) => matchesKeywords(ex.name, preferences.liked));
  const rest = shuffled.filter((ex) => !matchesKeywords(ex.name, preferences.liked));
  return [...liked, ...rest];
}

// ---------------------------------------------------------------------------
// Duration-aware exercise count and day assembly.
// ---------------------------------------------------------------------------

const SECONDS_PER_SET = 35; // rough time to perform one working set
const WARMUP_COOLDOWN_MINUTES = 10;

function getTargetExerciseCount(
  durationMinutes: number,
  scheme: SetRepScheme,
  maxSlots: number
): number {
  const secondsPerExercise = scheme.sets * (SECONDS_PER_SET + scheme.restSeconds);
  const workingMinutes = Math.max(durationMinutes - WARMUP_COOLDOWN_MINUTES, 15);
  const estimate = Math.floor((workingMinutes * 60) / secondsPerExercise);
  return Math.max(3, Math.min(maxSlots, estimate));
}

function pickExercisesForDay(
  slots: MuscleGroup[],
  targetCount: number,
  tier: EquipmentTier,
  preferences: ParsedPreferences
): { group: MuscleGroup; exercise: LibraryExercise }[] {
  const chosenSlots = slots.slice(0, targetCount);
  const usedNames = new Set<string>();
  const picks: { group: MuscleGroup; exercise: LibraryExercise }[] = [];

  for (const group of chosenSlots) {
    const pool = EXERCISE_LIBRARY[tier][group];
    const ranked = rankExercises(pool, preferences);
    const chosen =
      ranked.find((ex) => !usedNames.has(ex.name)) ?? pool.find((ex) => !usedNames.has(ex.name)) ?? pool[0];
    usedNames.add(chosen.name);
    picks.push({ group, exercise: chosen });
  }

  return picks;
}

function buildTrainingDay(params: {
  dayNumber: number;
  template: DayTemplate;
  tier: EquipmentTier;
  scheme: SetRepScheme;
  durationMinutes: number;
  goal: Goal;
  preferences: ParsedPreferences;
}): WorkoutPlan["weeklySchedule"][number] {
  const { dayNumber, template, tier, scheme, durationMinutes, goal, preferences } = params;

  const targetCount = getTargetExerciseCount(durationMinutes, scheme, template.slots.length);
  const picks = pickExercisesForDay(template.slots, targetCount, tier, preferences);

  const exercises = picks.map((pick, index) => ({
    name: pick.exercise.name,
    sets: scheme.sets,
    reps: scheme.reps,
    restSeconds: scheme.restSeconds,
    // Only the first (primary) exercise carries a coaching cue, to keep the
    // plan readable rather than repeating the same note on every line.
    notes: index === 0 ? GOAL_COACHING_CUE[goal] : "",
  }));

  const warmup = WARMUP_POOL[tier];
  const cooldown = COOLDOWN_POOL;

  const estimatedDurationMinutes = Math.round(
    (exercises.length * scheme.sets * (SECONDS_PER_SET + scheme.restSeconds)) / 60 +
      WARMUP_COOLDOWN_MINUTES
  );

  return {
    day: `Day ${dayNumber}`,
    title: template.title,
    focus: template.focus,
    estimatedDurationMinutes,
    warmup,
    exercises,
    cooldown,
  };
}

// ---------------------------------------------------------------------------
// Progression guidance and general safety notes.
// ---------------------------------------------------------------------------

function buildProgressionGuidance(goal: Goal, experienceLevel: ExperienceLevel): string[] {
  const guidance: string[] = [];

  switch (goal) {
    case "build_muscle":
      guidance.push(
        "Once you can complete every set at the top of the rep range with good form, add a small amount of weight (or a couple more reps) next session."
      );
      break;
    case "strength":
      guidance.push(
        "Add weight in small increments (about 2.5-5%) once you can complete every prescribed rep with solid form."
      );
      break;
    case "lose_fat":
      guidance.push(
        "As the workouts get easier, shorten rest periods slightly before adding weight — the goal is to keep intensity high."
      );
      break;
    case "general_fitness":
      guidance.push(
        "Every 2-3 weeks, increase either the weight, the reps, or the number of sets slightly to keep progressing."
      );
      break;
    case "endurance":
      guidance.push(
        "Gradually increase reps or total sets before increasing weight — endurance work rewards consistency over load."
      );
      break;
    case "athletic_performance":
      guidance.push(
        "Prioritize moving the weight explosively; increase load only when your movement speed stays fast and controlled."
      );
      break;
  }

  guidance.push("Track your sets, reps, and weight each session so you can see real progress over time.");

  if (experienceLevel === "beginner") {
    guidance.push(
      "For your first 2-4 weeks, prioritize learning correct form over adding weight — light and precise beats heavy and sloppy."
    );
  } else if (experienceLevel === "advanced") {
    guidance.push(
      "Consider a lighter deload week every 4-6 weeks to help your body recover and keep progressing long-term."
    );
  }

  guidance.push(
    "Regenerate this plan every few weeks, or whenever your schedule, goals, or available equipment change."
  );

  return guidance;
}

function buildSafetyNotes(tier: EquipmentTier): string[] {
  const notes = [
    "Warm up before every session and stop any exercise that causes sharp or worsening pain.",
    "Prioritize proper form over lifting heavier or moving faster — quality reps build results safely.",
    "Allow at least one rest or active-recovery day between sessions that train the same muscle groups.",
  ];

  if (tier === "full_gym") {
    notes.push("Use a spotter or safety bars for heavy barbell lifts like squats and bench press.");
  }

  return notes;
}

// Deliberately does NOT try to interpret or work around the injury — see the
// file-level comment at the top for why. This is purely a visibility flag.
function buildInjuryWarning(injuriesOrLimitations: string): string | null {
  const trimmed = injuriesOrLimitations.trim();
  if (!trimmed) return null;

  const preview = trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;

  return (
    `You mentioned: "${preview}". This generator builds plans from general rules only — ` +
    "it does not adjust exercise selection for injuries or medical conditions. Skip or modify " +
    "any exercise that causes pain, and check with a doctor or physical therapist before " +
    "continuing if you're unsure what's safe for you."
  );
}

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const GOAL_LABELS: Record<Goal, string> = {
  build_muscle: "Build muscle",
  lose_fat: "Lose fat",
  general_fitness: "General fitness",
  strength: "Strength",
  endurance: "Endurance",
  athletic_performance: "Athletic performance",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight_only: "Bodyweight only",
  dumbbells: "Dumbbells",
  barbell: "Barbell",
  resistance_bands: "Resistance bands",
  kettlebells: "Kettlebells",
  pull_up_bar: "Pull-up bar",
  cardio_machines: "Cardio machines",
  full_gym: "Full gym access",
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function generateWorkoutPlan(input: OnboardingInput): WorkoutPlan {
  const tier = determineEquipmentTier(input.equipment);
  const scheme = getSetRepScheme(input.goal, input.experienceLevel);
  const templates = getSplitTemplates(input.daysPerWeek);
  const preferences = parsePreferences(input.exercisePreferences);

  const weeklySchedule = templates.map((template, index) =>
    buildTrainingDay({
      dayNumber: index + 1,
      template,
      tier,
      scheme,
      durationMinutes: input.sessionDurationMinutes,
      goal: input.goal,
      preferences,
    })
  );

  return {
    summary: {
      goal: GOAL_LABELS[input.goal],
      experienceLevel: input.experienceLevel,
      daysPerWeek: input.daysPerWeek,
      equipment: input.equipment.map((item) => EQUIPMENT_LABELS[item]),
      sessionDurationMinutes: input.sessionDurationMinutes,
    },
    weeklySchedule,
    progressionGuidance: buildProgressionGuidance(input.goal, input.experienceLevel),
    safetyNotes: buildSafetyNotes(tier),
    injuryWarning: buildInjuryWarning(input.injuriesOrLimitations),
  };
}
