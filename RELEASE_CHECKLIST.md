# Release Checklist

Use this before opening the app up to real users. Items are grouped by what's already verified
in this repository vs. what still needs a human with real Supabase/browser access.

## Already verified (structural / automated)

- [x] `npx tsc --noEmit` passes with zero errors
- [x] `npm run lint` passes with zero errors/warnings
- [x] `npm run build` succeeds with no build warnings
- [x] No `console.log`/`console.debug` or leftover `TODO`/`FIXME` comments in the codebase
- [x] Every Supabase table has row-level security enabled with explicit policies
- [x] Every mutation follows the optimistic-update-then-persist pattern (no user-entered data is
  discarded on a save failure — errors surface via a dismissible banner instead)

## Database

- [ ] Apply every migration in `supabase/migrations/` (through
  `0013_reconcile_pending_schema.sql`) to the target Supabase project, in order. If `0011` was
  already applied and you're seeing `infinite recursion detected in policy for relation
  "profiles"` (SQLSTATE 42P17), that's exactly what `0012` fixes — see its header comment. If
  `0008`-`0011` error with "already exists" when rerun, that's expected (they already applied) —
  `0013` is an idempotent reconciliation pass safe to run regardless of exactly what already
  exists
- [ ] Manually set `profiles.is_admin = true` for at least one real admin account (there is no UI
  for this by design — it's not settable through the normal profile-update path)
- [ ] Confirm the `feedback-screenshots` storage bucket was created (migration 0011) and is
  private
- [ ] Spot-check RLS: sign in as a non-admin and confirm `/admin` redirects home; sign in as an
  admin and confirm the dashboard loads real cross-user aggregates

## Environment

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon key) set in
  the production environment
- [ ] Confirm Supabase auth email templates (confirmation, password reset) are configured and
  not using placeholder text
- [ ] Decide whether email confirmation is required for signup in production (it currently is,
  which blocked automated testing in this development environment — see `KNOWN_ISSUES.md`)

## Manual QA (none of this has been performed in this development environment — see below)

- [ ] Sign up a brand-new account and confirm the onboarding checklist appears, guides through
  all five steps, and never reappears after completion or skip
- [ ] Generate a plan, start a workout, log sets, replace an exercise, edit the plan, save/use a
  template, favorite an exercise, change a setting — confirm each fires the expected analytics
  event (spot-check via the `/admin` dashboard or a direct query on `analytics_events`)
- [ ] Submit feedback with and without a screenshot; confirm it appears on `/admin`
- [ ] Complete 5 workouts (or wait 7 days) and confirm the rating prompt appears once, then never
  again after dismissing or rating
- [ ] Force a component error (e.g. temporarily throw in a component) and confirm the error
  boundary shows the recovery screen, "Try again" and "Return home" both work, and a row appears
  in `crash_reports`
- [ ] Refresh mid-workout, sign in on a second device/tab, and go offline mid-session — confirm
  nothing crashes and no already-entered data disappears
- [ ] Full pass through the Phase 6–8 testing checklists already documented in this repo's
  history (exercise replacement, plan editing, dark mode, settings persistence, swipe gestures)

## Content and legal

- [ ] Have `PRIVACY.md` reviewed by someone qualified before publishing it as an actual privacy
  policy — it's accurate to the code but not legal advice
- [ ] Update `README.md`, which still describes the app as fully offline/local (pre-dates
  authentication) — see `KNOWN_ISSUES.md`
- [ ] Confirm the in-app medical/fitness disclaimer is prominent enough for your risk tolerance

## Post-launch monitoring

- [ ] Decide on a cadence for checking `/admin`'s feedback and crash-report trends
- [ ] Decide whether/when to build real notification delivery for the reminder settings that
  currently only store a preference
