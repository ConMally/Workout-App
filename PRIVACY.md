# Privacy

This describes what data the AI Workout Plan Generator actually collects and how it's used. It's
written to be accurate to the current beta implementation, not generic legal boilerplate — if
you're preparing this for a real public launch, have it reviewed by counsel before publishing.

**This app is a fitness education tool, not a medical device. Nothing here is medical advice —
see the in-app disclaimer.**

## Data we store

Everything is stored in Supabase (Postgres), scoped to your account via row-level security —
other users, including admins, cannot read your workout data through the normal app. The tables
an admin *can* aggregate across all users for the beta dashboard are called out below.

| Data | Purpose | Table(s) |
|---|---|---|
| Account (email, password hash) | Sign-in | Supabase Auth (`auth.users`) |
| Display name, weight unit, experience level, weekly target | Personalization | `profiles` |
| Generated workout plans | Core feature | `workout_plans` and children |
| Active/completed workouts, sets, weights, reps | Core feature, progress tracking | `active_workouts`, `completed_workouts` and children |
| Personal records, readiness check-ins, goals, exercise notes | Core feature | `personal_records`, `readiness_checkins`, `goals`, `exercise_notes` |
| Templates, favorites, substitution history | Core feature | `workout_templates` and children, `exercise_favorites`, `plan_substitution_history` |
| App settings (units, theme, notification preferences) | Personalization | `user_settings` |
| Feedback you submit (bug reports, feature requests, ratings, optional screenshot) | Improving the app | `feedback`, `feedback-screenshots` storage bucket |
| Crash reports (error message, stack trace, which screen, when) | Fixing bugs | `crash_reports` |
| Anonymous product usage events (see below) | Understanding feature usage | `analytics_events` |

## What "anonymous" means for analytics events

`analytics_events` records *that something happened* — e.g. "a workout was started," "settings
were changed," "a template was used" — tagged with your account id (so we can count distinct
active users) and a small number of structural facts (a count, a category, a boolean). It **never**
contains exercise names, weights, reps, notes, or any other workout content. The canonical list
of tracked event types lives in `types/beta.ts`.

## Feedback and screenshots

If you submit feedback, we store your message, the page you were on, the app version, and your
browser/device string (`navigator.userAgent`), plus an optional screenshot if you attach one.
Screenshots are stored in a private storage bucket — only you and admins can read them.

## Crash reports

If the app hits an unexpected error, we record the error message, stack trace, which part of the
app it happened in, and your account id (if signed in) so we can investigate and fix it. This
happens automatically; there's no separate consent step for it today (see `KNOWN_ISSUES.md`).

## Who can see what

- **You** can see and manage all of your own data through the app itself (Account page for
  profile/settings, Settings for export where available).
- **Admins** (a small, manually-flagged set of accounts) can see aggregate, cross-user counts
  (total users, most-used exercises, feedback trends, etc.) via a hidden `/admin` dashboard, and
  can read individual feedback/crash reports to act on them. Admins do not have a UI to browse
  other users' personal workout logs.
- **Nobody else.** We don't sell or share your data with third parties beyond the infrastructure
  provider (Supabase) that hosts it.

## Deletion

Deleting your account (when that flow exists in the UI) removes your profile and cascades to
delete every table above via foreign-key `on delete cascade` — there's no separate manual
cleanup step required.

## Third parties

- **Supabase** hosts the database, authentication, and file storage this app runs on.
- No other third-party analytics, advertising, or tracking services are used.
