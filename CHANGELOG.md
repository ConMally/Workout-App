# Changelog

All notable changes to this project, grouped by development phase. This project has not yet had
a public release — every entry below shipped to the same `main` branch during active
development, ahead of the first beta.

## Post-Phase 9 fix — admin RLS recursion

- Fixed `infinite recursion detected in policy for relation "profiles"` (Postgres `42P17`),
  caused by the Phase 9 admin-bypass policies checking `is_admin` via an inline subquery against
  `profiles` from a policy defined on `profiles` itself. Replaced with a `security definer`
  helper function, `public.is_current_user_admin()` (`0012_fix_admin_policy_recursion.sql`),
  which every admin-bypass policy now calls instead. No behavior change for regular users; admin
  access rules are unchanged, just no longer recursive.

## Phase 9 — Real User Beta & Feedback System

- In-app feedback (bug/feature/general reports) with optional screenshot upload, stored in
  Supabase (`feedback` table + private `feedback-screenshots` storage bucket)
- Lightweight, provider-agnostic product analytics (`analytics_events` table) tracking 10 event
  types (workout generated/started/completed, exercise replaced, template created/used, exercise
  favorited, workout edited, settings changed, coach recommendation opened) — no personal workout
  content is ever recorded, only structural counts/categories
- First-time user onboarding checklist (five guided steps: create a plan, start a workout, log a
  set, view progress, find the Exercise Library), skippable at any point, never shown again once
  completed
- Post-usage rating prompt (after 5 completed workouts or 7 days of use), dismissible forever
- Crash reporting: error boundaries around the main app content, reporting to Supabase
  (`crash_reports` table) with a friendly recovery screen (retry / return home)
- Hidden `/admin` dashboard (server-gated by `profiles.is_admin`, not linked from navigation):
  total/active users, workouts created/completed, feedback trends, most-used exercises/
  templates/equipment, most common goals

## Phase 8 — Beta Testing, Bug Fixes & Product Refinement

- Fixed a defensive gap where an active workout with no exercises could render a blank screen
  with no way out
- Added an actionable "Log in again" recovery path for expired-session errors, in both the
  top-level load-failure screen and the inline save-error banner
- Removed duplicated "what's next" messaging between the new Dashboard spotlight tile and the
  older `RecommendationCard` (the latter was deleted)
- Verified (without code changes) that corrupted local cache, missing/deleted exercise metadata,
  duplicate templates, and non-deterministic coach recommendations were already handled correctly

## Phase 7 — Premium UX, Performance & Personalization

- Full settings/personalization system: dark mode, compact mode, larger text, timer sound,
  vibration, default rest duration, auto-expand exercise guide, notification preferences
  (stored only — no delivery channel yet)
- Skeleton loaders for Dashboard, Plan, Exercise Library, History, Active Workout, Coach, and
  Templates
- Dashboard "spotlight" strip (recovery status, monthly consistency, next progression target,
  coach insight of the day) reusing the existing analytics computation
- Active workout polish: circular exercise progress ring, motivational messages, smoother
  completion feedback, swipe gestures (left/right to navigate exercises, up to open the
  overview, down to dismiss it)
- Offline banner, consistent empty states, lazy-loaded exercise modals and Coach section

## Phase 6.1 — Focused Active Workout Experience

- Redesigned active workout UI around one exercise at a time, with previous/next navigation, a
  jump-to-exercise overview drawer, and persisted focus position (`active_workouts
  .active_exercise_index`) that survives a refresh
- Integrated the exercise library (guide, previous performance, best 1RM) directly into the
  active workout screen

## Phase 6 — Smart Exercise Library & Plan Customization

- Centralized exercise database (`lib/exercises/`) covering 10 muscle groups with instructions,
  coaching cues, common mistakes, and recommended rep/rest ranges
- Ranked exercise replacement (preserves muscle group, movement pattern, difficulty, equipment)
- Full plan editor (add/remove/duplicate/move exercises and days, rename, adjust sets/reps/rest)
  with live smart suggestions (duplicate movement, muscle imbalance, volume too high/low)
- Equipment-adaptation flow, exercise comparison, and Supabase-synced favorites

## Phase 5 — AI Coach & Analytics

- Deterministic coach recommendations (progression, plateau, consistency, recovery, muscle
  balance, readiness) computed from existing history/plan/goals data
- Recovery score, weekly volume/consistency analytics, overload targets, weekly report,
  consistency calendar

## Phase 4B — Workout Templates 2.0

- Full template CRUD, duplication, favoriting, and "start a plan from a template" flow

## Phase 4 — Supabase Data Migration

- Migrated every workout-data domain (plan, active workout, history, goals, PRs, readiness,
  settings, substitutions) from localStorage to Supabase, behind a repository-interface
  abstraction so local and cloud storage share one contract
- One-time localStorage → cloud data migration flow for existing users

## Phase 3 — Authentication

- Full Supabase Auth integration (signup, login, password reset, session middleware); the app
  became sign-in-required

## Phase 2 — Dashboard, Insights & Goals

- Dashboard, streaks, PR detection, readiness check-ins, strength/consistency insights, goals

## Phase 1 — Initial Release

- Rule-based workout plan generator (no external API), onboarding form, active workout logging,
  rest timer, workout history
