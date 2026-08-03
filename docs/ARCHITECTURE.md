# Architecture

A guide to how this app is actually put together, for anyone extending it. Written from the
current state of the code, not aspirationally — if something described here looks wrong, the
code is the source of truth.

## Stack

Next.js (App Router) + TypeScript (strict) + Tailwind CSS + Zod, backed by Supabase (Postgres +
Auth + Storage). No local/guest mode exists today — every route behind `/` requires a signed-in
session (enforced server-side in `proxy.ts`/middleware).

## The repository pattern

Every piece of user data flows through an interface in `lib/repositories/*-repository.ts`
(e.g. `PlanRepository`, `HistoryRepository`, `FeedbackRepository`). Each interface has two
implementations:

- `lib/repositories/supabase/*.ts` — the real, active implementation, talking to Postgres via
  the Supabase JS client
- `lib/repositories/local/*.ts` — a localStorage-backed implementation, kept for architectural
  symmetry from an earlier phase of the project. **This path is currently dead code** — there is
  no guest/local-only mode in the app today, so `useRepositories()` never returns the local
  bundle. It exists so the interface boundary stays honest (nothing outside `lib/repositories/`
  should ever assume Supabase specifically) and so a future guest mode could be reintroduced
  cheaply.

All per-user repositories are bundled into one `Repositories` object (`lib/repositories/types.ts`),
resolved by `useRepositories()` (`lib/repositories/useRepositories.ts`) — a hook callable from
*any* client component, not just `app/page.tsx`. It returns `{status: "loading" | "unauthenticated"
| "ready", userId, repositories}`.

**Why this matters for extension:** to add a new piece of user data, add an interface + two
implementations + one line in each of `types.ts`/`local/index.ts`/`supabase/index.ts`. Nothing
else needs to change. The Phase 9 `feedback`/`analyticsEvents`/`crashReports` repositories are a
recent, representative example to copy.

**The one deliberate exception**: the hidden `/admin` dashboard (`app/admin/page.tsx`) does *not*
go through the Repositories bundle — it queries Supabase directly with its own cross-user
aggregate queries, authorized by dedicated admin-bypass RLS policies (migration `0011`). Admin
reporting is a fundamentally different shape (aggregate-across-everyone) than "this user's own
data," so forcing it through the per-user repository interface would be the wrong abstraction.

## Data loading

`app/page.tsx` has one `useEffect` that loads every domain (plan, active workout, history,
settings, goals, substitutions, templates, favorites, profile extras) in a single `Promise.all`,
gated behind `useRepositories()`'s `"ready"` status. Nothing renders until it resolves. This
re-runs whenever the resolved user identity changes (sign-in, sign-out, account switch) — never
on unrelated re-renders, since `useRepositories()` memoizes its return value.

Mutations follow one consistent pattern (`runMutation()` in `app/page.tsx`): update local React
state immediately (optimistic), then fire the actual Supabase write without awaiting it in the
UI thread. A failure surfaces via a dismissible error banner — the local state is never rolled
back except for the few explicitly-optimistic toggles (template/exercise favorites) that need
rollback-on-failure semantics.

## Exercise library

`lib/exercises/data.ts` holds a static, in-code array of ~70 `ExerciseDefinition` objects (name,
muscle groups, movement pattern, difficulty, instructions, coaching cues, etc.) — **not** a
database table. This matches the precedent set by `lib/workout-generator.ts`'s exercise pools
and `lib/exercise-substitutions.ts`'s substitution lists: exercise *definitions* are reference
data compiled into the app, not per-user data. `lib/exercises/library.ts` builds lookup Maps once
at module load (`getExerciseByName`, `getExerciseById`).

Two taxonomies coexist by design: an older 8-group `MuscleGroup` (`lib/exercise-substitutions.ts`,
used by Phase 5's analytics math) and a newer, richer 10-group one (`types/exercises.ts`, used by
the library/replacement/comparison system). `lib/exercises/library.ts#toLegacyMuscleGroup()`
bridges the two one-way rather than migrating the older analytics code.

Only **favorites** are per-user Supabase data (`exercise_favorites` table) — everything else
about an exercise is static.

Exercise *replacement* (`lib/exercises/replacement.ts#rankReplacements`) hard-filters to the same
primary muscle group, then scores candidates on movement pattern, difficulty, exercise kind,
laterality, secondary-muscle overlap, and equipment availability. It never crosses primary-muscle
boundaries — "never recommend an unrelated movement" is structural, not just a high bar on score.

## Active workout

`types/workout-log.ts#ActiveWorkout` is the canonical shape: `id`, `startedAt`,
`dayIndex/Label/Title/Focus`, an array of `LoggedExercise` (each with a fixed-size array of
`LoggedSet`), and `activeExerciseIndex` (which exercise the focused UI is currently showing,
added in Phase 6.1 so a refresh reopens the same exercise). At most one active workout exists
per user at a time (unique constraint on `active_workouts.user_id`).

The UI (`components/workout/ActiveWorkout.tsx`) shows one exercise at a time
(`FocusedExercise.tsx` → `ExerciseLogger.tsx`), with `lib/useActiveExerciseNavigation.ts` owning
navigation state and `lib/useSwipeGesture.ts` providing touch gestures. Navigation only ever
moves on explicit user action — nothing auto-advances.

The exercise/set *shape* is fixed once a workout is created — there's no add/remove-set feature
mid-workout (see `KNOWN_ISSUES.md`). This is why the Supabase repository can safely use a plain
upsert-by-position strategy (`active_workout_exercises`/`active_workout_sets`, keyed by
`sort_order`/`set_number`) instead of diffing and deleting orphaned rows.

## AI Coach & analytics

`lib/analytics/index.ts#computeCoachAnalytics()` is the single entry point — it calls every
sub-calculation in `lib/analytics/*.ts` (volume, consistency, trends, recovery, plateau
detection, overload targets, recommendations, weekly report) plus reuses several Phase-2/5
functions from `lib/insights.ts`/`lib/readiness.ts`. Every recommendation is a deterministic pure
function of `history`/`plan`/`goals`/`substitutionHistory`/`weeklyTarget` — no randomness, no
external calls, so recommendations are reproducible and testable.

`Dashboard.tsx` is the *only* place that calls `computeCoachAnalytics()` (once, memoized) — the
result is passed as a prop to both `DashboardSpotlight` (the top-of-page glance strip) and
`CoachSection` (the full detail further down, code-split via `next/dynamic`). No component below
that ever recomputes analytics itself; they only render already-computed results.

## Settings & personalization

One row per user in `user_settings`, mirrored by `types/workout-log.ts#AppSettings`. A single
generic mutator (`app/page.tsx#handleUpdateSettings(patch)`) handles every field — there is no
per-field handler. Dark mode / compact mode / larger text apply via
`components/settings/ThemeEffect.tsx`, which toggles classes on `<html>` (`dark`, `compact`,
`larger-text`) picked up by `app/globals.css`'s `@custom-variant dark` and CSS rules; there is no
server-rendered theme (a flash-of-wrong-theme on first paint is possible on the separate
`/account` route, which doesn't yet load settings — see `KNOWN_ISSUES.md`).

## Analytics events (product usage, distinct from AI Coach analytics)

Don't confuse this with the AI Coach's analytics above — `analytics_events` is a separate,
much simpler system for lightweight *product usage* tracking (Phase 9), deliberately built to be
provider-swappable:

```
component → lib/analytics-events/useTrackEvent.ts → Repositories.analyticsEvents
    → lib/repositories/supabase/analytics-event-repository.ts → analytics_events table
```

To replace Supabase with a different analytics provider later, write one new
`AnalyticsEventRepository` implementation and swap it in `lib/repositories/supabase/index.ts` (or
add a third bundle) — no call site changes. `useTrackEvent()` is fire-and-forget and swallows
errors; a failed analytics write must never surface to the user or block the action that
triggered it. The canonical event-name list lives in `types/beta.ts#AnalyticsEventName`.

## Database schema

See `supabase/migrations/*.sql` for the authoritative, incrementally-applied schema — every
migration is additive (new tables, or new nullable/defaulted columns) so no migration has ever
required a data backfill. Broad shape:

- **Account**: `profiles` (1:1 with `auth.users`), `user_settings`
- **Workout data**: `workout_plans` → `workout_plan_days` → `workout_plan_exercises`;
  `active_workouts` → `active_workout_exercises` → `active_workout_sets`; `completed_workouts` →
  `completed_workout_exercises` → `completed_workout_sets`
- **Progress**: `personal_records`, `readiness_checkins`, `goals`, `exercise_notes`
- **Templates**: `workout_templates` and children, plus a favorites join table
- **Exercise library extras**: `exercise_favorites`, `plan_substitution_history`
- **Beta program** (Phase 9): `feedback`, `analytics_events`, `crash_reports`, plus
  `profiles.is_admin` / `profiles.feedback_prompt_dismissed_at`

Every table has row-level security enabled with an `auth.uid() = user_id` (or `= id` for
`profiles`) policy. The Phase 9 tables additionally have admin-bypass `select` policies so
`/admin` can read cross-user aggregates without a service role key, gated by
`public.is_current_user_admin()` — a `security definer` SQL function (migration `0012`) that
checks `profiles.is_admin` for the current session. This exists specifically because an *inline*
`exists (select 1 from public.profiles ...)` subquery directly inside a policy on `profiles`
itself causes Postgres to detect infinite recursion (`42P17`) — evaluating the policy requires
re-evaluating every select policy on `profiles`, including itself. Routing the check through a
`security definer` function breaks the cycle: the function runs with its owner's privileges, so
its internal query never re-enters `profiles`' RLS at all. See migration `0012`'s header comment
for the full root-cause writeup, and always use `public.is_current_user_admin()` — never an
inline subquery — for any future admin-bypass policy on any table.

## Future extension points

- **Realtime sync** — add Supabase realtime subscriptions to eliminate the current multi-tab
  staleness (see `KNOWN_ISSUES.md`); the repository interfaces wouldn't need to change, only
  their Supabase implementations and a subscription layer in `useRepositories()`.
- **Guest/local mode** — the local repository implementations already exist; reintroducing this
  means adding a branch back into `useRepositories()` for a signed-out state that isn't just
  "redirect to login."
- **Notification delivery** — the settings already capture user intent (`workoutReminders`,
  `weeklySummary`, `streakReminders`); nothing sends anything yet. A scheduled job reading these
  flags plus `completed_workouts`/`analytics_events` would slot in without UI changes.
- **A different analytics provider** — see the "Analytics events" section above.
- **Full dark-mode coverage** — the CSS mechanism is in place app-wide; it's a matter of adding
  `dark:` classes to the remaining screens, not new infrastructure.
