# LiftWise

Train smarter. Progress with purpose. LiftWise generates a personalized weekly workout plan from a
rule-based engine — no external API or API key required to generate a plan. Built with Next.js (App
Router), TypeScript, Tailwind CSS, and Zod.

**This app is educational only and is not a substitute for professional medical or fitness advice.**

## Features

- Onboarding form for goal, experience level, training days, equipment, session length,
  injuries/limitations, and exercise preferences
- Server-side `/api/generate` route that builds a plan locally with `lib/workout-generator.ts`
  and returns strict, schema-validated JSON
- Separate exercise libraries for **full gym**, **dumbbells only**, and **bodyweight only**
  equipment, auto-selected from what you have available
- Support for 3, 4, 5, and 6-day (plus 1, 2, and 7-day) training splits
- Sets, reps, and rest periods that adjust based on whether your goal is muscle growth,
  strength, fat loss, general fitness, endurance, or athletic performance
- Clean card-based display of each training day (warm-up, exercises with sets/reps/rest,
  cooldown)
- Regenerate a plan for fresh exercise variety, or go back and edit your preferences
- Loading, error, and empty states
- A safety pre-filter that declines to generate a plan (and recommends professional guidance
  instead) when it detects mentions of severe injury, medical conditions, severe pain,
  pregnancy, or disordered eating
- A separate, clearly labeled warning banner whenever you mention any injury or limitation that
  doesn't trip the filter above — the generator does **not** try to work around it or give
  medical advice, it just tells you plainly to modify or skip anything that hurts and to check
  with a professional
- Basic in-memory rate limiting and input length limits
- **Your plan and preferences are saved automatically** (in your browser's `localStorage`) and
  restored on your next visit — no account needed
- **Workout logging**: start any day from your plan, log weight/reps per set, mark sets and
  whole exercises complete, add notes, and finish with one tap
- **Workout history**: every finished workout is saved locally and can be reviewed in detail
- **Rule-based progression suggestions** and **personal-record detection** (heaviest weight,
  most reps at a weight, estimated one-rep max) computed from your own logged history — no AI,
  fully deterministic
- An optional **rest timer** with 60/90/120/180s presets, pause/resume/reset, and an
  auto-start-after-each-set option you can turn off
- **A Dashboard home screen** (shown by default once you've generated a plan) with your current
  streak, workouts completed, total PRs, and total training time; today's/next workout with a
  one-tap Start/Resume button; your 3 most recent PRs; this week's progress (days trained,
  workouts, sets, minutes) shown with lightweight CSS progress bars — no chart libraries; your
  last 5 completed workouts; and one next-step recommendation reused from the same progression
  logic as the Active Workout tab
- **Exercise substitutions**: a "Swap" button next to every exercise on the Plan tab swaps just
  that one exercise for another targeting the same muscle group (keeping sets/reps/rest
  unchanged), avoiding repeats, and persists the change to your saved plan
- **Settings** (its own tab): toggle the automatic rest timer, switch the displayed weight unit
  between lbs/kg, clear an in-progress workout, and export/import all of your data as a JSON file
- **Insights** (its own tab): rule-based, deterministic analysis of your workout history — no AI,
  nothing sent anywhere. Covers training consistency (a documented 0-100 score), strength progress
  per exercise with a lightweight SVG trend chart, weekly logged-weighted-volume trend, muscle-group
  balance (push/pull, upper/lower, chest/back, quads/posterior-chain, shoulders/arms, core
  frequency), exercise frequency and neglected muscle groups, recovery-pattern trends from optional
  post-workout check-ins, and up to 3 ranked "next action" suggestions with a plain-language reason
  behind each one
- **Post-workout check-in**: after finishing a workout, optionally rate difficulty, energy,
  soreness, sleep quality, and satisfaction (1-10 each, every field individually skippable). Fully
  optional — skip the whole thing with one tap. Used only to surface your own recovery trends; a
  general rest/professional-guidance message appears if soreness has been rated very high
- **Exercise progress detail**: a per-exercise page (reachable from History, the Dashboard's Recent
  PRs, Insights, and the "View progress" link while logging a workout) showing logged-workout
  count, total sets, first/most-recent performance, heaviest weight, best reps, best estimated
  1RM, full PR history, a current progression recommendation, and a trend chart
- **Progress goals**: create, edit, and delete lightweight goals (exercise weight, exercise
  estimated 1RM, total workouts, weekly frequency, or streak). Only the goal's target is stored —
  current value and progress percentage are always computed live from your history, so they can
  never drift out of sync with what you've actually logged

## Prerequisites

- A Mac
- Node.js 18.18 or newer (instructions below if you don't have it)

That's it — there's no API key to obtain and no account to sign up for.

## 1. Install Node.js (skip if you already have it)

Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter) and check if you already
have it:

```bash
node -v
```

If that prints a version number of 18.18 or higher, skip to step 2. If you see
`command not found`:

1. Go to https://nodejs.org
2. Download the **LTS** version for macOS (the big button on the homepage)
3. Open the downloaded `.pkg` file and click through the installer (Continue → Continue →
   Install), entering your Mac password if asked
4. Close and reopen Terminal, then confirm it worked:

```bash
node -v
npm -v
```

Both commands should print version numbers (npm comes bundled with Node — no separate install
needed).

## 2. Install project dependencies

In Terminal, move into the project folder and install packages:

```bash
cd "/Users/connor/Documents/Claude/Workout App"
npm install
```

This downloads Next.js, React, Zod, and Tailwind CSS into a `node_modules` folder. It may take a
minute or two the first time.

## 3. Run the app

No environment variables, API keys, or `.env` files are needed — just start the dev server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser. Fill out the form and click
**Generate my workout plan**.

To stop the server, go back to Terminal and press `Ctrl + C`.

## Project structure

```
app/
  page.tsx                     # Main page — tabs, view-state machine, localStorage hydration
  layout.tsx                    # Root HTML layout
  globals.css                    # Tailwind import + base styles
  api/generate/route.ts           # Server route — validates input and calls the generator
components/
  navigation/AppNavigation.tsx      # Dashboard / Plan / Active Workout / History / Insights / Settings
  dashboard/                         # Dashboard, StatsCard, TodayWorkout, WeeklyProgress,
                                       # RecentActivity, RecentPRs, RecommendationCard, QuickActions
  settings/SettingsPanel.tsx          # Rest timer toggle, weight unit, clear/export/import data
  workout/                           # ActiveWorkout, ExerciseLogger, RestTimer, PostWorkoutCheckIn
  history/                            # WorkoutHistory, WorkoutHistoryDetail
  insights/                            # InsightsPage + one component per section (NextActions,
                                         # ConsistencyCard, StrengthProgress, VolumeTrend,
                                         # MuscleBalance, ExerciseFrequency, ReadinessTrends,
                                         # MiniLineChart — a shared dependency-free SVG line chart)
  goals/                                # GoalsPanel, GoalForm
  exercises/ExerciseProgressDetail.tsx    # Shared per-exercise detail view
  PRCelebration.tsx                        # Personal-record banner
  ...                                       # Onboarding form, plan cards, loading/error/empty states
lib/
  workout-generator.ts               # The rule-based plan generator — no external API calls
  schemas.ts                          # Zod schemas for form input and the generated plan
  safety.ts                            # Keyword pre-filter for injury/medical/pregnancy/eating-disorder mentions
  rate-limit.ts                         # Simple in-memory rate limiter
  storage.ts                             # Versioned, SSR-safe localStorage read/write layer, plus
                                           # export/import of the full data set
  progression.ts                          # Progression suggestions + PR detection (rep-range
                                            # parsing, Epley 1RM) — deterministic, no AI
  workout-log.ts                           # Active/completed workout construction + formatting helpers
  dashboard.ts                              # Streak, longest streak, weekly stats, historical PR
                                              # aggregation, next-workout/recommendation logic, and
                                              # shared date helpers (toDateKey/getWeekStart/etc.)
  exercise-substitutions.ts                  # Muscle-group substitution pool for "Swap"; also the
                                               # single source of truth for exercise -> muscle group
  muscle-groups.ts                            # Push/pull/upper/lower/arms categories built on top
                                                # of exercise-substitutions' groups
  insights.ts                                  # Consistency score, volume trend, muscle balance,
                                                 # exercise frequency, per-exercise stats, and the
                                                 # ranked next-actions engine — all pure functions
  readiness.ts                                  # Post-workout check-in trend detection
  goals.ts                                       # Goal current-value/progress (always computed
                                                   # live from history, never persisted)
types/
  workout.ts                         # Re-exports onboarding/plan types from lib/schemas.ts
  workout-log.ts                      # Zod schemas + types for logged sets/exercises, active and
                                        # completed workouts (incl. optional readiness check-in),
                                        # settings, PR/progression shapes
  dashboard.ts                         # Derived, non-persisted dashboard shapes
  insights.ts                           # Derived, non-persisted insights shapes
  goals.ts                               # Goal Zod schema + derived GoalProgress shape
```

## How plans are generated

`lib/workout-generator.ts` builds each plan with a handful of rules instead of an LLM call:

1. **Equipment tier** — picks the `full_gym`, `dumbbells`, or `bodyweight` exercise library
   based on what you selected (full gym takes priority if you have it, then dumbbells, then
   bodyweight-only).
2. **Split** — maps your days/week to a weekly template: 1-3 days uses Full Body, 4 days uses
   Upper/Lower, 5 days uses Push/Pull/Legs/Upper/Lower, 6 days repeats Push/Pull/Legs twice, and
   7 days adds an extra Full Body day.
3. **Sets, reps, and rest** — looked up from your goal (muscle growth, strength, fat loss,
   general fitness, endurance, or athletic performance), then nudged slightly by experience
   level (beginners get a bit less volume and more rest; advanced users get a bit more volume).
4. **Exercise count** — estimated from your requested session duration and the rest periods for
   your goal, so a 30-minute fat-loss session and a 75-minute strength session naturally get
   different numbers of exercises.
5. **Exercise selection** — shuffled from the chosen equipment library each time (so
   **Regenerate** gives you a different combination), lightly filtered by simple keyword
   matching against your exercise preferences text (e.g. mentioning "dislike running" avoids
   running-like exercises; mentioning "kettlebells" favors kettlebell-style movements where
   available).

## Workout logging, history, and localStorage

Everything you log — your saved plan and preferences, an in-progress workout, and your full
completed-workout history — lives in your browser's `localStorage`, through a small versioned
persistence layer in `lib/storage.ts`. There's still no account and no database:

- Each stored value is wrapped in a `{ version, data }` envelope and validated with Zod on every
  read. Corrupted or unrecognized data is discarded safely (never crashes the app) rather than
  displayed.
- Only one workout can be "active" (in progress) at a time. Starting a new one requires
  finishing or discarding the current one first.
- **Start Over** (on the Plan tab) clears your saved plan, preferences, and any unfinished
  active workout — but never your completed workout history — after an explicit confirmation.
- Progression suggestions and personal records (heaviest weight, most reps at a weight,
  estimated one-rep max via the Epley formula: `1RM = weight x (1 + reps / 30)`) are computed
  fresh from your history each time — nothing is invented if you never entered a weight.

## The Dashboard, substitutions, and settings

- **Dashboard** (`lib/dashboard.ts`) computes everything it shows from your existing
  `history`/`plan`/`activeWorkout` state — nothing new is persisted just for the dashboard.
  Streak is the count of consecutive calendar days with at least one completed workout. Total
  PRs and "recent PRs" are reconstructed by walking your full history oldest-to-newest and
  calling the same `detectPersonalRecords` used at finish-time, since PRs were previously only
  ever computed transiently. "Today's workout" resumes an in-progress workout if you have one,
  otherwise suggests the day after whichever you most recently completed. The next
  recommendation reuses `getProgressionSuggestion` from your most recent workout, falling back
  to a plain "next day up" message if you haven't logged a weight yet.
- **Exercise substitutions** (`lib/exercise-substitutions.ts`) are looked up from a small,
  independent muscle-group -> exercise-name pool — it does not read from or modify the rule-based
  generator's own exercise library, so swapping never changes generator behavior. A swap replaces
  only that exercise's name in your saved plan (sets/reps/rest are untouched) and is written back
  to `localStorage` immediately. A separate `substitutions` storage key remembers which names have
  already been shown per exercise slot so repeat swaps cycle through options; it's cleared
  whenever you regenerate or start over, since a new plan invalidates the old slots.
- **Settings** are stored in the existing `settings` key — `weightUnit` was added with a Zod
  `.default("lbs")`, so older saved settings without it still load safely, no migration needed.
  Export bundles every storage key into one JSON file you save locally; import validates that
  file against the same schemas before overwriting anything, so a malformed file changes nothing.

## Insights, readiness, and goals

Everything on the Insights tab is deterministic and computed from your own logged history —
no AI, no external calls, nothing sent anywhere:

- **Consistency score (0-100)** = up to 60 points for `min(1, workoutsLast7Days / weeklyTarget)`,
  up to 20 points for `min(1, currentStreak / 7)`, and up to 20 points for
  `min(1, workoutsLast30Days / (weeklyTarget × 30/7))`. `weeklyTarget` is your saved plan's
  days/week (defaults to 3 with no plan). The exact breakdown is shown in an expandable note next
  to the score, not just the number.
- **Weekly volume** = `Σ(weight × reps)` over completed sets with both a logged weight and reps;
  bodyweight and unlogged sets are excluded, never estimated. Percent change is `(current -
  previous) / previous × 100` (shown as "N/A" if the previous week had none), and the 4-week
  average is the mean of the last 4 weekly totals.
- **Muscle balance** looks at completed sets over the trailing 28 days, grouped via the same
  muscle-group map the "Swap" feature uses, and shown as push/pull, upper/lower, chest/back,
  quads/posterior-chain, shoulders/arms, plus core frequency on its own. The
  "posterior chain (hamstrings/glutes)" label is intentional — the underlying taxonomy groups
  hamstring, glute, and hip-hinge movements together, so it's labeled as what it actually
  measures rather than implying a precise hamstrings isolation.
- **Next actions** are generated by independent rules (high recent soreness/difficulty, a small
  weekly-goal gap, a push/pull imbalance, the latest progression suggestion, a neglected muscle
  group, and a low-data fallback), each with a fixed priority; the top 3 are shown, each with a
  one-line "based on..." explanation citing the real numbers behind it.
- **"Enough data" thresholds**: consistency needs ≥1 completed workout; strength progress needs
  ≥2 logged sessions of an exercise before it appears in the picker; volume trend needs ≥1 week
  with any logged weighted set; a muscle-balance pair needs ≥6 combined completed sets in the
  28-day window (otherwise just that pair shows "not enough data yet"); readiness trends need ≥2
  check-ins, and "consistently high" language needs ≥3.
- **Post-workout check-in** ratings are stored directly on the completed workout
  (`readiness`, individually-nullable per field) and never diagnose injury, fatigue, or
  overtraining — only a general rest/professional-guidance note when soreness has been rated
  very high (≥9 on the latest workout, or ≥8 on 2+ of the last 3).
- **Goals** persist only their definition (type, title, target, optional date). Current value and
  progress percentage are always recomputed live from history via the same functions used
  elsewhere (streak, weekly count, per-exercise heaviest weight/1RM), so a goal can never show a
  number that's out of sync with your actual logged workouts.
- **Storage migration**: the `readiness` field on completed workouts and the new `goals` key are
  both additive with Zod `.default()` values rather than version bumps — existing history entries
  and exported backup files from before this feature parse safely with `readiness: null` /
  `goals: []`, with no migration step required.

## Known limitations (this is a minimum working version)

- **Data lives only in one browser, on one device.** `localStorage` isn't synced anywhere —
  switching browsers, using private/incognito mode, or clearing site data loses everything.
  There's no way to back it up, export it, or access it from a second device without a real
  account and a database.
- **No multi-device sync, no server-side backup.** If this ever needs to survive a browser
  reinstall or work across phone + laptop, it needs real accounts and a database — `lib/storage.ts`
  is written so that swap is contained (the versioned envelope + Zod validation pattern carries
  over to an API-backed store), but it isn't built yet.
- **localStorage has a small capacity ceiling** (typically ~5-10MB per origin, browser-dependent).
  An extremely long history of workouts could theoretically approach that, though realistically
  it would take many years of regular use — there's no pagination or archival built in yet.
- **Rate limiting is in-memory** and per-server-process. It resets when the server restarts and
  won't coordinate across multiple instances (e.g. serverless functions on Vercel can each have
  their own memory). For production, swap `lib/rate-limit.ts` for a shared store like Upstash
  Redis or Vercel KV.
- **The safety pre-filter is keyword-based** and intentionally conservative — it may occasionally
  decline requests that would have been fine. That's a deliberate tradeoff: when in doubt, this
  app asks you to check with a professional rather than guess.
- **The exercise-preference matching is a simple keyword heuristic**, not real language
  understanding — it can miss nuance or occasionally mis-parse an unusual sentence.
- **The generator never tailors exercises to an injury.** If you mention one, you'll see a clear
  warning card, but the plan itself is unchanged — deciding what's safe for a specific injury
  requires real medical judgment that a rule engine can't provide.
- **PRs and progression suggestions only ever look backward at what you've logged** — if you
  never enter a weight for an exercise, no recommendation is invented, by design.
- **The muscle-group taxonomy is coarse and single-tag.** A handful of exercises (e.g. Diamond
  Push-Up) legitimately work more than one group, but each exercise name can only map to one
  group in the current data model — the pool's declaration order decides which group wins. This
  only affects Insights' muscle-balance/frequency analysis, not the workout plan itself.
- **Insights, readiness, and goals are all look-backward and computed client-side** — like the
  rest of the app, nothing is predicted or inferred beyond simple arithmetic over what you've
  actually logged.

## Deploying to Vercel

1. Push this project to a GitHub repository
2. Import it at https://vercel.com/new
3. Deploy — no environment variables are required

## Accounts and authentication (optional)

Signing in is fully optional — every feature above works identically with no account. If you sign
up, an account and editable profile (display name, preferred weight unit, experience level,
weekly training target) are created and stored in Supabase, but **workout data itself
(plan/history/goals/settings) still lives only in this browser's `localStorage`** — signing in
doesn't move or sync anything yet. See [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) for the
auth routes, session/security details, and the Supabase settings (redirect URLs, Google OAuth)
you need to configure manually. See [`docs/SUPABASE.md`](docs/SUPABASE.md) for the full database
schema, environment variables, and project setup steps.
