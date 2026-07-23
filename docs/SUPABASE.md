# Supabase foundation

This app still runs entirely on **localStorage** — nothing described here is
wired into the running app yet. This document covers the groundwork that's
been laid so a future phase can add authentication and cloud storage without
a rewrite: Supabase client helpers, a database schema with Row Level
Security, generated-shape TypeScript types, and repository interfaces.

If you haven't touched any of this, the app behaves exactly as before. You
do not need a Supabase project to run `npm run dev`.

## What exists today vs. what's still local

| Concern | Today | This phase adds |
|---|---|---|
| Plan, active workout, history, goals, settings | `localStorage` via `lib/storage.ts` | A parallel DB schema + repository *interfaces* (no implementation swap) |
| Auth | None | Client/server/middleware helpers, ready for a login page (not built) |
| Data migration | N/A | A `migration_status` table to track it later (nothing runs yet) |

## 1. Environment variables

Copy `.env.example` to `.env.local` and fill in your own project's values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |

Both are safe to expose to the browser — the anon key only grants what your
RLS policies allow (see below). **Never** put a `service_role` key in a
`NEXT_PUBLIC_*` variable, in this repo, or anywhere client-reachable; it
bypasses RLS entirely. If a server-only privileged operation is ever needed,
it belongs in a Route Handler or Server Action reading a non-`NEXT_PUBLIC_`
env var, never in a Client Component.

`.env.local` is already in `.gitignore`. `.env.example` has placeholders
only — never commit real credentials to it.

## 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is enough for development).
2. Wait for provisioning to finish, then open Project Settings → API and copy the URL + anon key into `.env.local`.
3. That's it for account setup — steps 3+ below are about the database itself.

## 3. Run the migration

The schema lives in `supabase/migrations/0001_init.sql`. Two ways to apply it:

**Dashboard (simplest, no CLI install):**
1. Open your project's SQL Editor in the Supabase dashboard.
2. Paste the full contents of `supabase/migrations/0001_init.sql`.
3. Run it. It's a single idempotent-by-convention migration (fresh project only — it does not `drop` or `if not exists` anything, since it's meant to run once against an empty database).

**Supabase CLI (if you use one across environments):**
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Verify: Table Editor should show 16 new tables, and Authentication → Policies should show 4 policies on each.

## 4. Database structure

Everything maps directly onto the app's existing Zod types — see the
per-table comments in the migration file for the exact source type each
one mirrors. Summary:

- **`profiles`** — one row per user, `id` *is* the `auth.users` id.
- **`workout_plans` → `workout_plan_days` → `workout_plan_exercises`** — mirrors `OnboardingInput` + the generated `WorkoutPlan`. Only one `is_active` plan per user at a time (enforced by a partial unique index), matching the single-saved-plan localStorage model. `warmup`/`cooldown` are stored as JSONB (`{name, duration}[]`) rather than another relational table, since they're simple display lists.
- **`active_workouts` → `active_workout_exercises` → `active_workout_sets`** — mirrors `ActiveWorkout`. `user_id` is `unique` on `active_workouts`: at most one in-progress workout per user, same as today.
- **`completed_workouts` → `completed_workout_exercises` → `completed_workout_sets`** — mirrors `CompletedWorkout`.
- **`readiness_checkins`** — mirrors `CompletedWorkoutSchema.readiness`, normalized into its own table with a `unique` FK back to `completed_workouts` (1:1).
- **`personal_records`** — a new persisted concept. Today, PRs are recomputed on every load by `lib/progression.ts#detectPersonalRecords` walking full history. This table is where a future implementation would *store* that output instead of recalculating it every time. Nothing writes to it yet.
- **`goals`** — mirrors `GoalSchema`. Deliberately does **not** store current value or progress percentage — `lib/goals.ts#getGoalProgress` always computes those live from history today, and the schema preserves that so a value can never drift out of sync with what's actually logged.
- **`exercise_notes`** — new, no current app feature uses it. A standalone per-exercise journal, distinct from the per-set `note` field already embedded on logged exercises.
- **`user_settings`** — mirrors `AppSettings`; one row per user, `user_id` is the primary key.
- **`migration_status`** — one row per user, tracks the *future* one-time localStorage → cloud import (status, timestamps, item counts). This phase does not perform that migration or write to this table from the app.

Every table has `created_at` (and `updated_at` where the row can change,
kept current by a shared `set_updated_at()` trigger), UUID primary keys
(`gen_random_uuid()`), and a direct `user_id` (or `id`, for the three
singleton-per-user tables) column for ownership — never inferred through a
join to a parent table.

**Cascades**: deleting a user cascades through everything they own
(`auth.users` → `profiles`/`workout_plans`/... → children). Deleting a
`workout_plan` cascades to its days and exercises, but `active_workouts`
and `completed_workouts` only `set null` on their `workout_plan_id` — an
in-progress or finished workout is a snapshot and should outlive the plan
it started from, matching how `createActiveWorkout` already copies exercise
data at start time rather than referencing the plan live.

**Indexes** beyond the unique constraints (which each create their own):
`completed_workouts(user_id, completed_at desc)` for history lists,
`completed_workout_exercises(user_id, name)` for per-exercise lookups
(Strength Progress, Exercise Progress Detail), `personal_records(user_id,
achieved_at desc)` and `(user_id, exercise_name, achieved_at desc)` for
recent-PRs and per-exercise PR history, plus a `user_id` index on every
other child table for its natural parent-scoped queries.

## 5. Row Level Security

Every one of the 16 tables has RLS **enabled**, with four policies each
(`select` / `insert` / `update` / `delete`). Every policy — no exceptions —
checks:

```sql
auth.uid() = user_id   -- or `= id` on profiles/user_settings/migration_status
```

`auth.uid()` comes from the verified JWT in the request's session, not
from anything the client sends in the row itself. The `insert`/`update`
policies use `with check (...)`, which means even a request that tries to
write a row with someone else's `user_id` is rejected by Postgres — the
app *sets* `user_id` when writing, but never gets to decide whose data it
actually lands in. There are no cross-table/join-based policies; every
check is a single-column comparison on the row being touched, which keeps
policies both easy to audit and fast.

A `handle_new_user()` trigger on `auth.users` creates the matching
`profiles` / `user_settings` / `migration_status` rows automatically the
moment someone signs up — dormant until a real signup flow exists.

## 6. Client/server helpers

- **`lib/supabase/client.ts`** — `createClient()` for Client Components. Never call this from a component that also touches the DOM/rendering directly for data access; go through a repository implementation once one exists.
- **`lib/supabase/server.ts`** — `createClient()` (async) for Server Components, Route Handlers, and Server Actions. Creates a fresh client per call rather than a shared singleton.
- **`lib/supabase/middleware.ts`** + root **`proxy.ts`** — refreshes the auth session cookie on every request, required because Server Components can't write cookies themselves. (Next.js 16 renamed the "middleware" file convention to "proxy" — same mechanism, new filename/export.) **No-ops immediately** if `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set, so the app runs identically with zero Supabase configuration.
- **`lib/supabase/env.ts`** — the one place that reads the env vars; throws a clear, actionable error only when a helper is actually invoked without them configured (never at import/build time).

## 7. Repository interfaces

`lib/repositories/` defines seven interfaces (`ProfileRepository`,
`PlanRepository`, `ActiveWorkoutRepository`, `HistoryRepository`,
`GoalRepository`, `PRRepository`, `SettingsRepository`), each expressed in
terms of the app's **existing** domain types (`SavedPlanState`,
`ActiveWorkout`, `CompletedWorkout`, `Goal`, `AppSettings`,
`DatedPersonalRecord`) rather than raw database rows. Nothing implements
them yet, and nothing in `app/` or `components/` imports them — `lib/storage.ts`
remains the only thing the running app actually reads and writes through.
The point of the interface existing now is that a future
`SupabaseXRepository` and the current localStorage functions can both
satisfy the same contract, so swapping one for the other later doesn't
require touching any component.

## What's still blocked

Until you complete steps 1–3 above (create a project, set env vars, run the
migration), none of this is reachable — which is fine, since nothing in the
app calls it yet. Once you have a project and want to move to the next
phase, that work (a login page, wiring repositories to real Supabase calls,
and the actual localStorage → cloud migration) is intentionally **not**
part of this change.
