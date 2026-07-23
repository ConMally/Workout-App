// A small, independent exercise-substitution library. Deliberately does NOT
// import from lib/workout-generator.ts — that file's exercise library is
// private and this feature must not change generator behavior. Instead this
// keeps its own name -> muscle-group map and per-group candidate pools,
// covering the same exercise names the generator produces (plus a few extra
// well-known alternates) so swaps look natural.

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "quads"
  | "posterior_chain"
  | "biceps"
  | "triceps"
  | "core";

const SUBSTITUTION_POOLS: Record<MuscleGroup, string[]> = {
  chest: [
    "Barbell Bench Press",
    "Incline Dumbbell Press",
    "Cable Chest Fly",
    "Machine Chest Press",
    "Push-Up",
    "Dumbbell Bench Press",
    "Dumbbell Floor Press",
    "Dumbbell Fly",
    "Incline Push-Up (feet elevated)",
    "Decline Push-Up (hands elevated)",
    "Wide-Grip Push-Up",
    "Diamond Push-Up",
  ],
  back: [
    "Barbell Bent-Over Row",
    "Lat Pulldown",
    "Seated Cable Row",
    "Pull-Up",
    "T-Bar Row",
    "Single-Arm Dumbbell Row",
    "Renegade Row",
    "Dumbbell Pullover",
    "Bent-Over Dumbbell Row",
    "Dumbbell Reverse Fly",
    "Inverted Row",
    "Superman Row",
    "Doorway Row",
    "Towel Row",
    "Assisted Pull-Up",
  ],
  shoulders: [
    "Barbell Overhead Press",
    "Dumbbell Lateral Raise",
    "Cable Face Pull",
    "Machine Shoulder Press",
    "Arnold Press",
    "Dumbbell Shoulder Press",
    "Dumbbell Front Raise",
    "Dumbbell Upright Row",
    "Pike Push-Up",
    "Wall Handstand Hold",
    "Arm Circles with Pause",
    "Lateral Raise Hold",
    "Wall Slide",
  ],
  quads: [
    "Barbell Back Squat",
    "Leg Press",
    "Walking Lunge",
    "Leg Extension",
    "Front Squat",
    "Hack Squat",
    "Dumbbell Goblet Squat",
    "Dumbbell Walking Lunge",
    "Dumbbell Step-Up",
    "Bulgarian Split Squat",
    "Dumbbell Front Squat",
    "Bodyweight Squat",
    "Jump Squat",
    "Wall Sit",
  ],
  posterior_chain: [
    "Romanian Deadlift",
    "Hip Thrust",
    "Seated Leg Curl",
    "Barbell Deadlift",
    "Glute Bridge",
    "Dumbbell Romanian Deadlift",
    "Dumbbell Hip Thrust",
    "Single-Leg Dumbbell Deadlift",
    "Dumbbell Glute Bridge",
    "Dumbbell Sumo Deadlift",
    "Single-Leg Glute Bridge",
    "Reverse Lunge",
    "Bodyweight Good Morning",
    "Donkey Kick",
  ],
  biceps: [
    "Barbell Bicep Curl",
    "Dumbbell Bicep Curl",
    "Dumbbell Hammer Curl",
    "Cable Curl",
    "Preacher Curl",
    "Incline Dumbbell Curl",
    "Concentration Curl",
    "Cross-Body Hammer Curl",
    "Chin-Up",
    "Slow-Negative Chin-Up",
    "Doorframe Curl",
    "Towel Isometric Curl",
    "Resistance Hold Curl",
  ],
  triceps: [
    "Cable Tricep Pushdown",
    "Skull Crusher",
    "Dumbbell Overhead Tricep Extension",
    "Close-Grip Bench Press",
    "Tricep Dip",
    "Dumbbell Kickback",
    "Close-Grip Dumbbell Press",
    "Dumbbell Floor Skull Crusher",
    "Tricep Dip (chair or bench)",
    "Diamond Push-Up",
    "Close-Grip Push-Up",
    "Bench Dip",
    "Pike Tricep Push-Up",
  ],
  core: [
    "Cable Woodchopper",
    "Hanging Leg Raise",
    "Weighted Plank",
    "Machine Ab Crunch",
    "Russian Twist",
    "Dumbbell Russian Twist",
    "Dumbbell Side Bend",
    "Dumbbell Sit-Up",
    "Hollow Body Hold",
    "Plank",
    "Bicycle Crunch",
    "Mountain Climber",
  ],
};

const EXERCISE_GROUP: Record<string, MuscleGroup> = {};
for (const [group, names] of Object.entries(SUBSTITUTION_POOLS) as [MuscleGroup, string[]][]) {
  for (const name of names) {
    EXERCISE_GROUP[name.toLowerCase()] = group;
  }
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns a replacement exercise name from the same muscle group as
 * `exerciseName`, excluding `excludeNames` (already-used names for this
 * slot) where possible. Falls back to allowing repeats only once every
 * option in the group has already been shown. Returns null if the exercise
 * isn't recognized (no group to substitute within).
 */
export function getSubstitute(exerciseName: string, excludeNames: string[]): string | null {
  const group = EXERCISE_GROUP[normalize(exerciseName)];
  if (!group) return null;

  const pool = SUBSTITUTION_POOLS[group];
  const excluded = new Set([normalize(exerciseName), ...excludeNames.map(normalize)]);

  const fresh = pool.filter((name) => !excluded.has(normalize(name)));
  if (fresh.length > 0) {
    return fresh[Math.floor(Math.random() * fresh.length)];
  }

  // Every alternate in the group has already been shown for this slot —
  // allow repeats rather than getting permanently stuck, but still avoid
  // immediately re-picking the exercise currently displayed.
  const anyOther = pool.filter((name) => normalize(name) !== normalize(exerciseName));
  if (anyOther.length === 0) return null;
  return anyOther[Math.floor(Math.random() * anyOther.length)];
}

export function hasSubstitutes(exerciseName: string): boolean {
  return EXERCISE_GROUP[normalize(exerciseName)] !== undefined;
}

/**
 * The single source of truth for exercise -> muscle-group lookups, reused
 * by lib/muscle-groups.ts and lib/insights.ts rather than duplicated.
 * Returns null for names outside the known pool (e.g. a name never
 * generated or swapped in by this app).
 */
export function getMuscleGroup(exerciseName: string): MuscleGroup | null {
  return EXERCISE_GROUP[normalize(exerciseName)] ?? null;
}
