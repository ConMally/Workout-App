-- Phase 7: personalization settings (types/workout-log.ts's AppSettings).
-- Every column is either not-null-with-default (safe for existing rows) or
-- itself defaulted in application code — matches this table's existing
-- convention (see 0001_init.sql's user_settings header).

alter table public.user_settings
  add column timer_sound boolean not null default true,
  add column vibration boolean not null default true,
  add column default_rest_seconds integer not null default 90 check (default_rest_seconds between 0 and 600),
  add column show_exercise_guide_automatically boolean not null default true,
  add column dark_mode boolean not null default false,
  add column compact_mode boolean not null default false,
  add column larger_text boolean not null default false,
  add column workout_reminders boolean not null default false,
  add column weekly_summary boolean not null default false,
  add column streak_reminders boolean not null default false;
