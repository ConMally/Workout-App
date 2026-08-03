# Known Issues

Honest, current list of known gaps and limitations. None of these are crashes or data-loss bugs
as far as we've been able to verify — they're scoped-out functionality or verification gaps.

## Functional limitations

- **No cross-tab/cross-device realtime sync.** Two tabs (or devices) open at once won't see each
  other's writes until a reload. Last write wins; nothing is corrupted, but a user could be
  briefly confused. Fixing this properly means adding Supabase realtime subscriptions.
- **Notification settings are stored but not delivered.** Workout reminders, weekly summary, and
  streak reminders in Settings save correctly but have no delivery mechanism (no email/push
  infrastructure exists yet). The Settings UI should say this more clearly before public launch.
- **Dark mode coverage is not exhaustive.** The app shell, Dashboard, Settings, and Active
  Workout have full dark-mode styling. Some deeper Coach cards, Templates, and a few other
  screens remain light-only.
- **No add/remove-set in the active workout.** The set count is fixed once a workout starts
  (matches the generated/edited plan). You can add or remove sets when editing the *plan*, but
  not mid-workout — the Supabase active-workout schema assumes a fixed exercise/set shape once a
  workout is created.
- **History has no true pagination.** The app loads your 200 most recent completed workouts for
  dashboard/insights math. Older workouts remain in the database but aren't surfaced in the UI.
- **Screenshot uploads are capped at 5 MB** with no client-side compression, so a very large
  photo will be rejected rather than resized.
- **Admin dashboard aggregates are unpaginated,** capped at a few thousand rows per query. Fine
  at current beta scale; will need real pagination/indexing before a large user base.

## Verification gaps

- **No live signed-in QA has been performed in this development environment.** The Supabase
  project used for development requires email confirmation on signup, and this environment has
  no inbox access — every phase's manual testing has been structural (code review, `tsc`/`lint`/
  `build`, static analysis) rather than click-through testing in a real signed-in session. This
  is the single biggest gap before a public launch — see `RELEASE_CHECKLIST.md`.
- Migrations `0009` through `0013` (active-workout focus index, settings personalization, and
  the Phase 9 beta program tables) have not been applied to any live database as part of this
  work — they exist as SQL files only. Apply them via the Supabase SQL Editor (or CLI) before
  testing or deploying.

## Documentation drift

- `README.md` predates Supabase/authentication entirely and describes the app as fully
  local/offline with "no external API, no internet connection required." That's no longer
  accurate — the app now requires a Supabase account and an internet connection. It should be
  rewritten before public launch; see `docs/ARCHITECTURE.md` for the current accurate picture.
