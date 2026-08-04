"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingForm, { type OnboardingFormValues } from "@/components/OnboardingForm";
import WorkoutPlanView from "@/components/WorkoutPlanView";
import LoadingState from "@/components/LoadingState";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import Disclaimer from "@/components/Disclaimer";
import OfflineBanner from "@/components/OfflineBanner";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import type { Tab } from "@/components/navigation/AppNavigation";
import ActiveWorkoutView from "@/components/workout/ActiveWorkout";
import PostWorkoutCheckIn from "@/components/workout/PostWorkoutCheckIn";
import WorkoutHistory from "@/components/history/WorkoutHistory";
import Dashboard from "@/components/dashboard/Dashboard";
import InsightsPage from "@/components/insights/InsightsPage";
import SettingsPanel from "@/components/settings/SettingsPanel";
import ThemeEffect from "@/components/settings/ThemeEffect";
import ExerciseProgressDetail from "@/components/exercises/ExerciseProgressDetail";
import AppHeader from "@/components/layout/AppHeader";
import MigrationBanner from "@/components/migration/MigrationBanner";
import TemplateList from "@/components/templates/TemplateList";
import SaveAsTemplateDialog from "@/components/templates/SaveAsTemplateDialog";
import UnsavedChangesDialog from "@/components/templates/UnsavedChangesDialog";
import type { TemplateEditorSubmitInput } from "@/components/templates/TemplateEditor";
import { useRepositories } from "@/lib/repositories/useRepositories";
import { getFriendlyDataErrorMessage, isSessionExpiredMessage, isUniqueViolation } from "@/lib/supabase/data-errors";
import { createClient } from "@/lib/supabase/client";
import { createSupabaseProfileRepository } from "@/lib/repositories/supabase/profile-repository";
import type { WorkoutPlan } from "@/types/workout";
import type { Goal } from "@/types/goals";
import type { DatedPersonalRecord } from "@/types/dashboard";
import type { TemplateSummary, WorkoutTemplate } from "@/types/templates";
import { createTemplate as buildTemplate, toTemplateSummary } from "@/lib/templates";
import {
  DEFAULT_SETTINGS,
  type ActiveWorkout,
  type AppSettings,
  type CompletedWorkout,
  type PersonalRecordEvent,
  type Readiness,
} from "@/types/workout-log";
import { type SubstitutionHistory } from "@/lib/storage";
import { computeDurationSeconds, createActiveWorkout } from "@/lib/workout-log";
import { detectPersonalRecords } from "@/lib/progression";
import ExerciseLibraryBrowser from "@/components/exercises/ExerciseLibraryBrowser";
import { useTrackEvent } from "@/lib/analytics-events/useTrackEvent";
import FeedbackButton from "@/components/feedback/FeedbackButton";
import RatingPrompt from "@/components/feedback/RatingPrompt";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { APP_VERSION } from "@/lib/version";

type ViewState =
  | { status: "form" }
  | { status: "loading" }
  | { status: "plan"; plan: WorkoutPlan }
  | { status: "declined"; message: string }
  | { status: "error"; message: string };

const DEFAULT_FORM_VALUES: OnboardingFormValues = {
  goal: "general_fitness",
  experienceLevel: "beginner",
  daysPerWeek: 3,
  equipment: ["bodyweight_only"],
  sessionDurationMinutes: 45,
  injuriesOrLimitations: "",
  exercisePreferences: "",
};

// Signed-in dashboard/insights/goals math all runs over whatever history is
// loaded into memory (lib/dashboard.ts, lib/insights.ts, lib/goals.ts) —
// bounding the fetch keeps that correct for the vast majority of accounts
// without ever loading a user's entire lifetime of sets on every page load.
// True cursor pagination of the History tab's own list UI is a known,
// documented gap for a future phase.
const MAX_HISTORY_FOR_STATS = 200;

// Not part of the Repositories bundle — these live on profiles, an
// account-level concept with no local/signed-out equivalent (see
// lib/repositories/profile-repository.ts). One fetch here covers
// weeklyTrainingTarget (existing) plus the Phase 9 onboarding/feedback-
// prompt fields, rather than a second round trip for each.
interface ProfileExtras {
  weeklyTarget: number | null;
  onboardingCompleted: boolean;
  feedbackPromptDismissedAt: string | null;
  accountCreatedAt: string | null;
  displayName: string | null;
}

async function fetchProfileExtras(userId: string): Promise<ProfileExtras> {
  const profile = await createSupabaseProfileRepository(createClient()).getProfile(userId);
  return {
    weeklyTarget: profile?.weeklyTrainingTarget ?? null,
    onboardingCompleted: profile?.onboardingCompleted ?? true, // fail safe: never show onboarding on a load error
    feedbackPromptDismissedAt: profile?.feedbackPromptDismissedAt ?? null,
    accountCreatedAt: profile?.createdAt ?? null,
    // Never the email — the Dashboard greeting (PART 1 of the redesign)
    // falls back to neutral copy when this is null rather than showing an
    // email address.
    displayName: profile?.displayName ?? null,
  };
}

// Tags a repository call with the domain it belongs to so a failure in the
// main load effect's Promise.all names the exact operation that broke
// instead of surfacing only the generic "couldn't load your data" message —
// every one of these calls maps a raw Supabase/PostgREST response into app
// types, so a shape mismatch throws here, not at the network layer, and
// would otherwise be indistinguishable from every other domain's failure.
async function loadDomain<T>(domain: string, promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[data-load] ${domain} failed:`, error);
    }
    throw error;
  }
}

export default function Home() {
  const router = useRouter();
  const reposState = useRepositories();
  const trackEvent = useTrackEvent();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [view, setView] = useState<ViewState>({ status: "form" });
  const [formValues, setFormValues] = useState<OnboardingFormValues>(DEFAULT_FORM_VALUES);
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<CompletedWorkout | null>(null);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [recentPRs, setRecentPRs] = useState<PersonalRecordEvent[]>([]);
  const [substitutionHistory, setSubstitutionHistory] = useState<SubstitutionHistory>({});
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [feedbackPromptDismissedAt, setFeedbackPromptDismissedAt] = useState<string | null>(null);
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [visitedExercisesTab, setVisitedExercisesTab] = useState(false);
  // Captured once at mount (not recomputed on every render) purely to
  // evaluate the rating prompt's "7 days of use" trigger below.
  const [nowSnapshot] = useState(() => Date.now());
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
  const [templateUseSuccess, setTemplateUseSuccess] = useState<string | null>(null);
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<Set<string>>(new Set());
  // Tracks whether the Templates tab's create/edit form has unsaved
  // changes, so switching to a different tab mid-edit can warn first —
  // TemplateEditor's own Cancel button and the beforeunload fallback
  // handle the other two "leave a dirty editor" cases on their own (see
  // components/templates/TemplateEditor.tsx).
  const [templatesEditorDirty, setTemplatesEditorDirty] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<Tab | null>(null);

  // Only honor a "?tab=" link from elsewhere in the app (e.g. the nav bar on
  // /account) on the very first load — re-applying it on every account
  // switch would yank the user back to that tab even after they've since
  // navigated elsewhere in this same session.
  const hasAppliedTabParam = useRef(false);

  // The single place that loads all signed-in/signed-out data. Re-runs
  // whenever reposState changes identity — which happens on mount, after
  // sign-in, after sign-out, and after switching to a different account
  // (see lib/repositories/useRepositories.ts) — never on unrelated
  // re-renders, since that hook memoizes its return value. Every domain is
  // fully replaced from the new source on each run, and nothing is rendered
  // until it resolves (see the isLoadingData gate below), so a previous
  // account's data is never briefly visible after a switch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reposState.status !== "ready") return;

    const { repositories, userId } = reposState;
    // Built here (not inside load()) rather than awaited inline below, same
    // as every other domain in the Promise.all — reposState.status === "ready"
    // now always means a signed-in cloud session (this app has no
    // local/guest mode), so this always runs.
    const profileExtrasPromise = fetchProfileExtras(userId);
    let cancelled = false;

    setIsLoadingData(true);
    setLoadError(null);

    async function load() {
      try {
        const [
          savedPlan,
          savedActiveWorkout,
          historyResult,
          loadedSettings,
          loadedGoals,
          loadedSubstitutions,
          profileExtras,
          loadedTemplates,
          loadedFavorites,
        ] = await Promise.all([
          loadDomain("plan", repositories.plan.getActivePlan(userId)),
          loadDomain("activeWorkout", repositories.activeWorkout.getActiveWorkout(userId)),
          loadDomain("history", repositories.history.listHistory(userId, { limit: MAX_HISTORY_FOR_STATS })),
          loadDomain("settings", repositories.settings.getSettings(userId)),
          loadDomain("goals", repositories.goals.listGoals(userId)),
          loadDomain("substitutions", repositories.substitutions.getSubstitutionHistory(userId)),
          loadDomain("profileExtras", profileExtrasPromise),
          loadDomain("templates", repositories.templates.getTemplates(userId)),
          loadDomain("exerciseFavorites", repositories.exerciseFavorites.listFavorites(userId)),
        ]);

        if (cancelled) return;

        if (savedPlan) {
          setFormValues(savedPlan.preferences);
          setView({ status: "plan", plan: savedPlan.plan });
          setHasGeneratedBefore(true);
        } else {
          setFormValues(DEFAULT_FORM_VALUES);
          setView({ status: "form" });
          setHasGeneratedBefore(false);
        }

        setActiveWorkout(savedActiveWorkout);
        setPendingCompletion(null);
        setHistory(historyResult.items);
        setSettings(loadedSettings ?? DEFAULT_SETTINGS);
        setGoals(loadedGoals);
        setSubstitutionHistory(loadedSubstitutions);
        setWeeklyTarget(profileExtras.weeklyTarget);
        setDisplayName(profileExtras.displayName);
        setTemplates(loadedTemplates);
        setFavoriteExerciseIds(new Set(loadedFavorites.map((f) => f.exerciseId)));
        setSelectedHistoryId(null);
        setSelectedExercise(null);
        setRecentPRs([]);
        setShowOnboarding(!profileExtras.onboardingCompleted);
        setFeedbackPromptDismissedAt(profileExtras.feedbackPromptDismissedAt);
        setAccountCreatedAt(profileExtras.accountCreatedAt);

        let nextTab: Tab = savedActiveWorkout ? "workout" : savedPlan ? "dashboard" : "plan";

        if (!hasAppliedTabParam.current) {
          hasAppliedTabParam.current = true;
          const tabParam = new URLSearchParams(window.location.search).get("tab");
          const linkableTabs: Tab[] = ["dashboard", "plan", "history", "insights", "templates", "exercises", "settings"];
          if (tabParam && (linkableTabs as string[]).includes(tabParam)) {
            nextTab = tabParam as Tab;
          } else if (tabParam === "workout" && savedActiveWorkout) {
            nextTab = "workout";
          }
        }
        setActiveTab(nextTab);

        setIsLoadingData(false);
      } catch (error) {
        if (cancelled) return;
        setLoadError(getFriendlyDataErrorMessage(error));
        setIsLoadingData(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [reposState, reloadNonce]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fire-and-forget wrapper for writes that shouldn't block the UI the way
  // the old synchronous localStorage writes never did — the optimistic
  // setState already happened by the time this is called. Failures surface
  // as a dismissible banner rather than a thrown error or a reverted UI, per
  // this phase's "no offline mutation queue yet" scope.
  function runMutation(mutate: () => Promise<void>) {
    mutate().catch((error: unknown) => {
      setSaveError(getFriendlyDataErrorMessage(error));
    });
  }

  async function generatePlan(values: OnboardingFormValues) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const isFirstPlan = !hasGeneratedBefore;
    setFormValues(values);
    setView({ status: "loading" });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      setHasGeneratedBefore(true);

      if (data.status === "ok") {
        setView({ status: "plan", plan: data.plan });
        setSubstitutionHistory({});
        runMutation(() => repositories.substitutions.clearSubstitutionHistory(userId));
        trackEvent("workout_generated", {
          daysPerWeek: values.daysPerWeek,
          goal: values.goal,
          isFirstPlan,
        });
        if (isFirstPlan) setActiveTab("dashboard");

        runMutation(() =>
          repositories.plan.saveActivePlan(userId, {
            preferences: values,
            plan: data.plan,
            savedAt: new Date().toISOString(),
          })
        );
      } else if (data.status === "declined") {
        setView({ status: "declined", message: data.message });
      } else {
        setView({
          status: "error",
          message: data.message ?? "Something went wrong. Please try again.",
        });
      }
    } catch {
      setView({
        status: "error",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  function handleStartOver() {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const parts = ["This will clear your saved plan and preferences."];
    if (activeWorkout) {
      parts.push("You also have an unfinished workout in progress — it will be discarded too.");
    }
    parts.push("Your workout history will NOT be deleted.");

    if (!window.confirm(parts.join(" "))) return;

    runMutation(() => repositories.substitutions.clearSubstitutionHistory(userId));
    runMutation(() => repositories.plan.clearActivePlan(userId));
    runMutation(() => repositories.activeWorkout.clearActiveWorkout(userId));

    setView({ status: "form" });
    setFormValues(DEFAULT_FORM_VALUES);
    setHasGeneratedBefore(false);
    setActiveWorkout(null);
    setPendingCompletion(null);
    setSubstitutionHistory({});
    setActiveTab("plan");
  }

  function handleStartWorkout(dayIndex: number) {
    if (view.status !== "plan" || reposState.status !== "ready") return;
    const day = view.plan.weeklySchedule[dayIndex];
    if (!day) return;

    const { repositories, userId } = reposState;

    const workout = createActiveWorkout(day, dayIndex);
    setActiveWorkout(workout);
    runMutation(() => repositories.activeWorkout.createActiveWorkout(userId, workout));
    trackEvent("workout_started", { exerciseCount: workout.exercises.length });
    setActiveTab("workout");
  }

  function handleUpdateActiveWorkout(workout: ActiveWorkout) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    setActiveWorkout(workout);
    runMutation(() => repositories.activeWorkout.saveActiveWorkout(userId, workout));
  }

  // Single generic settings mutator (Phase 7) — replaces the old one-handler-
  // per-field pattern (handleToggleAutoStart/handleSetWeightUnit) now that
  // Settings has ~12 fields; every toggle/select in SettingsPanel and the
  // rest-timer auto-start toggle surfaced from ActiveWorkoutView both funnel
  // through this one optimistic-write path.
  function handleUpdateSettings(patch: Partial<AppSettings>) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const next = { ...settings, ...patch };
    setSettings(next);
    runMutation(() => repositories.settings.saveSettings(userId, next));
    trackEvent("settings_changed", { fields: Object.keys(patch).join(",") });
  }

  // "Finish Workout" no longer writes history directly — it stages a draft
  // completion and shows the optional readiness check-in. The actual
  // history write happens in finalizeWorkout, once the user saves or skips
  // that check-in, so the active workout in storage is untouched (and
  // recoverable) if they refresh mid check-in.
  function handleFinishWorkout() {
    if (!activeWorkout) return;

    const draft: CompletedWorkout = {
      id: activeWorkout.id,
      completedAt: new Date().toISOString(),
      dayIndex: activeWorkout.dayIndex,
      dayLabel: activeWorkout.dayLabel,
      dayTitle: activeWorkout.dayTitle,
      dayFocus: activeWorkout.dayFocus,
      durationSeconds: computeDurationSeconds(activeWorkout.startedAt),
      exercises: activeWorkout.exercises,
      readiness: null,
    };

    setPendingCompletion(draft);
  }

  // Unlike the other handlers, this one awaits its writes before touching
  // any state — finishing a workout should not appear to succeed (jumping
  // to the History tab) if it didn't actually save. On failure the active
  // workout and pending check-in are left exactly as they were so the user
  // can retry rather than losing the workout they just logged.
  // Idempotent by design: if a prior attempt partially succeeded (e.g. the
  // workout saved but the PR write or clearActiveWorkout step then failed),
  // retrying must not re-throw on the already-saved workout forever — that
  // would leave the user permanently stuck on the check-in screen even
  // though their workout is already safely in their history. Checking for
  // the existing row first, and treating a duplicate-key error on the PR
  // insert as "already recorded" (backed by the unique constraint added in
  // 0004_pr_uniqueness.sql), makes every step of this safely retryable.
  async function finalizeWorkout(readiness: Readiness | null) {
    if (!pendingCompletion || reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const completed: CompletedWorkout = { ...pendingCompletion, readiness };
    const prEvents = detectPersonalRecords(history, completed);

    try {
      const existing = await repositories.history.getCompletedWorkout(userId, completed.id);
      if (!existing) {
        await repositories.history.addCompletedWorkout(userId, completed);
      }

      if (prEvents.length > 0) {
        const datedEvents: DatedPersonalRecord[] = prEvents.map((event) => ({
          ...event,
          completedAt: completed.completedAt,
        }));
        try {
          await repositories.personalRecords.recordPersonalRecords(userId, completed.id, datedEvents);
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }

      await repositories.activeWorkout.clearActiveWorkout(userId);
    } catch (error) {
      setSaveError(getFriendlyDataErrorMessage(error));
      return;
    }

    setHistory([completed, ...history]);
    setActiveWorkout(null);
    setPendingCompletion(null);
    setRecentPRs(prEvents);
    trackEvent("workout_completed", {
      exerciseCount: completed.exercises.length,
      completedSetCount: completed.exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.completed).length, 0),
      prCount: prEvents.length,
    });
    setActiveTab("history");
  }

  function handleDiscardWorkout() {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    runMutation(() => repositories.activeWorkout.clearActiveWorkout(userId));
    setActiveWorkout(null);
    setPendingCompletion(null);
    setActiveTab("plan");
  }

  function handleClearActiveWorkoutFromSettings() {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    runMutation(() => repositories.activeWorkout.clearActiveWorkout(userId));
    setActiveWorkout(null);
    setPendingCompletion(null);
    if (activeTab === "workout") setActiveTab("dashboard");
  }

  // Replaces the old random getSubstitute() swap: newName now comes from
  // the user's pick in the ranked ReplacementPicker (lib/exercises/replacement.ts)
  // instead of being chosen for them. Persistence and substitutionHistory
  // exclude-list bookkeeping are unchanged from the prior swap flow.
  function handleReplaceExercise(dayIndex: number, exerciseIndex: number, newName: string) {
    if (view.status !== "plan" || reposState.status !== "ready") return;
    const day = view.plan.weeklySchedule[dayIndex];
    const exercise = day?.exercises[exerciseIndex];
    if (!day || !exercise) return;

    const { repositories, userId } = reposState;

    const nextWeeklySchedule = view.plan.weeklySchedule.map((d, di) =>
      di !== dayIndex
        ? d
        : {
            ...d,
            exercises: d.exercises.map((ex, ei) => (ei !== exerciseIndex ? ex : { ...ex, name: newName })),
          }
    );
    const nextPlan = { ...view.plan, weeklySchedule: nextWeeklySchedule };

    setView({ status: "plan", plan: nextPlan });
    runMutation(() =>
      repositories.plan.updateActivePlan(userId, {
        preferences: formValues,
        plan: nextPlan,
        savedAt: new Date().toISOString(),
      })
    );

    const key = `${dayIndex}:${exerciseIndex}`;
    const excludeNames = substitutionHistory[key] ?? [exercise.name];
    const nextSubstitutionHistory = { ...substitutionHistory, [key]: [...excludeNames, newName] };
    setSubstitutionHistory(nextSubstitutionHistory);
    runMutation(() => repositories.substitutions.saveSubstitutionHistory(userId, nextSubstitutionHistory));
    trackEvent("exercise_replaced");
  }

  // PART 4: full plan edits (add/remove/duplicate/move exercises and days,
  // renames, sets/reps/rest/notes) come back as a whole new weeklySchedule
  // from PlanEditor and persist through the same updateActivePlan call
  // every other plan mutation in this file uses — no new repository method.
  function handleSavePlanEdits(weeklySchedule: WorkoutPlan["weeklySchedule"]) {
    if (view.status !== "plan" || reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const nextPlan = { ...view.plan, weeklySchedule };
    setView({ status: "plan", plan: nextPlan });
    runMutation(() =>
      repositories.plan.updateActivePlan(userId, {
        preferences: formValues,
        plan: nextPlan,
        savedAt: new Date().toISOString(),
      })
    );
    trackEvent("workout_edited", { dayCount: weeklySchedule.length });
  }

  // PART 6: applies the accepted equipment-gap replacements (by exercise
  // name) across every day of the plan at once.
  function handleApplyEquipmentReplacements(replacements: { exerciseName: string; newName: string }[]) {
    if (view.status !== "plan" || reposState.status !== "ready" || replacements.length === 0) return;
    const { repositories, userId } = reposState;

    const nameMap = new Map(replacements.map((r) => [r.exerciseName, r.newName]));
    const nextWeeklySchedule = view.plan.weeklySchedule.map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) => (nameMap.has(ex.name) ? { ...ex, name: nameMap.get(ex.name)! } : ex)),
    }));
    const nextPlan = { ...view.plan, weeklySchedule: nextWeeklySchedule };

    setView({ status: "plan", plan: nextPlan });
    runMutation(() =>
      repositories.plan.updateActivePlan(userId, {
        preferences: formValues,
        plan: nextPlan,
        savedAt: new Date().toISOString(),
      })
    );
  }

  // PART 8: optimistic favorite toggle, same rollback-on-failure pattern as
  // handleToggleFavorite for templates.
  async function handleToggleExerciseFavorite(exerciseId: string) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const wasFavorite = favoriteExerciseIds.has(exerciseId);
    setFavoriteExerciseIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });

    try {
      if (wasFavorite) {
        await repositories.exerciseFavorites.removeFavorite(userId, exerciseId);
      } else {
        await repositories.exerciseFavorites.addFavorite(userId, exerciseId);
        trackEvent("exercise_favorited");
      }
    } catch (error) {
      setFavoriteExerciseIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(exerciseId);
        else next.delete(exerciseId);
        return next;
      });
      setSaveError(getFriendlyDataErrorMessage(error));
    }
  }

  function handleCreateGoal(goal: Goal) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    setGoals([goal, ...goals]);
    runMutation(() => repositories.goals.createGoal(userId, goal));
  }

  function handleUpdateGoal(goal: Goal) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    setGoals(goals.map((g) => (g.id === goal.id ? goal : g)));
    runMutation(() => repositories.goals.updateGoal(userId, goal));
  }

  function handleDeleteGoal(id: string) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    setGoals(goals.filter((g) => g.id !== id));
    runMutation(() => repositories.goals.deleteGoal(userId, id));
  }

  // Template handlers are awaited (not fire-and-forget like the settings/
  // goal handlers above) and let errors propagate — TemplateList owns its
  // own try/catch and inline error display for these, since template
  // create/edit is a deliberate guided flow that needs feedback tied
  // directly to the action, not just the page's global saveError banner.
  async function handleCreateTemplate(input: TemplateEditorSubmitInput) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const template = buildTemplate(input);
    await repositories.templates.createTemplate(userId, template);
    setTemplates((prev) => [toTemplateSummary(template), ...prev]);
    trackEvent("template_created", { dayCount: template.days.length, templateName: template.name });
  }

  async function handleUpdateTemplate(template: WorkoutTemplate) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    await repositories.templates.updateTemplate(userId, template);
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? toTemplateSummary(template) : t)));
  }

  // Optimistic: flips the star immediately, then rolls back to the prior
  // value if the write fails — TemplateList surfaces the thrown error
  // itself, this only needs to undo the local state it changed.
  async function handleToggleFavorite(templateId: string, isFavorite: boolean) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, isFavorite } : t)));
    try {
      await repositories.templates.toggleFavorite(userId, templateId, isFavorite);
    } catch (error) {
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !isFavorite } : t)));
      throw error;
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    await repositories.templates.deleteTemplate(userId, templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }

  async function handleDuplicateTemplate(templateId: string, newName: string) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const copy = await repositories.templates.duplicateTemplate(userId, templateId, newName);
    setTemplates((prev) => [toTemplateSummary(copy), ...prev]);
  }

  async function handleLoadTemplate(templateId: string): Promise<WorkoutTemplate | null> {
    if (reposState.status !== "ready") return null;
    const { repositories, userId } = reposState;
    return repositories.templates.getTemplate(userId, templateId);
  }

  // Generates a plan from the template and sets it as the active plan —
  // the same PlanRepository#saveActivePlan call generatePlan already uses,
  // so this composes with the existing plan flow rather than a parallel
  // path. TemplateList has already confirmed the destructive-replace
  // warning (if one was needed) before this ever runs — see
  // TemplateList.tsx#handleUseClick.
  async function handleUseTemplate(templateId: string) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    const summary = templates.find((t) => t.id === templateId);
    const plan = await repositories.templates.createWorkoutFromTemplate(userId, templateId);
    const preferences: OnboardingFormValues = {
      goal: summary?.goal ?? "general_fitness",
      experienceLevel: "intermediate",
      daysPerWeek: plan.weeklySchedule.length,
      equipment: ["full_gym"],
      sessionDurationMinutes: plan.summary.sessionDurationMinutes,
      injuriesOrLimitations: "",
      exercisePreferences: "",
    };

    await repositories.plan.saveActivePlan(userId, { preferences, plan, savedAt: new Date().toISOString() });

    setFormValues(preferences);
    setView({ status: "plan", plan });
    setHasGeneratedBefore(true);
    setSubstitutionHistory({});
    runMutation(() => repositories.substitutions.clearSubstitutionHistory(userId));
    trackEvent("template_used", { templateName: summary?.name ?? "unknown" });
    setActiveTab("plan");
    setTemplateUseSuccess(summary ? `Started "${summary.name}".` : "Plan started from template.");
  }

  function handleOpenSaveAsTemplate() {
    setSaveTemplateError(null);
    setShowSaveAsTemplate(true);
  }

  async function handleSaveAsTemplate(name: string, description: string | null) {
    if (view.status !== "plan" || reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    setSavingTemplate(true);
    setSaveTemplateError(null);
    try {
      const template = await repositories.templates.saveGeneratedWorkoutAsTemplate(
        userId,
        view.plan,
        formValues.goal,
        name,
        description
      );
      setTemplates((prev) => [toTemplateSummary(template), ...prev]);
      setShowSaveAsTemplate(false);
    } catch (error) {
      setSaveTemplateError(getFriendlyDataErrorMessage(error));
    } finally {
      setSavingTemplate(false);
    }
  }

  // This app has no guest/local mode — reaching this with no session means
  // the client-side auth state changed after the page already mounted
  // (session expired, revoked, or signed out in another tab). proxy.ts
  // blocks the initial request for every signed-out visitor server-side, so
  // this is the client-side backstop: bounce to /login immediately rather
  // than rendering (or leaving stale) any protected content, and preserve
  // the current location so login can send them back.
  useEffect(() => {
    if (reposState.status !== "unauthenticated") return;
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?redirectTo=${encodeURIComponent(here)}`);
  }, [reposState.status, router]);

  if (reposState.status === "loading" || reposState.status === "unauthenticated" || isLoadingData) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[var(--page-max-width)] flex-col gap-6 px-4 pt-8 pb-24 sm:gap-8 sm:px-6 sm:pt-12 sm:pb-12">
        <div role="status" aria-label="Loading" className="flex flex-col gap-3">
          <SkeletonBlock className="mx-auto h-8 w-72" />
          <SkeletonBlock className="h-11 w-full rounded-xl" />
        </div>
        <DashboardSkeleton />
      </main>
    );
  }

  if (loadError) {
    const sessionExpired = isSessionExpiredMessage(loadError);
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[var(--page-max-width)] flex-col gap-6 px-4 pt-8 pb-24 sm:gap-8 sm:px-6 sm:pt-12 sm:pb-12">
        <ErrorState
          title="Couldn't load your data"
          message={loadError}
          retryLabel={sessionExpired ? "Log in again" : "Try again"}
          onRetry={
            sessionExpired
              ? () => router.push(`/login?redirectTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)
              : () => setReloadNonce((n) => n + 1)
          }
        />
      </main>
    );
  }

  const currentPlan = view.status === "plan" ? view.plan : null;

  // PART 5: "after 5 completed workouts or 7 days of use" — either
  // condition triggers it, and it never shows once dismissed/rated (see
  // feedbackPromptDismissedAt, persisted via handleDismissRatingPrompt).
  const accountAgeDays = accountCreatedAt ? (nowSnapshot - new Date(accountCreatedAt).getTime()) / (24 * 60 * 60 * 1000) : 0;
  const shouldShowRatingPrompt = feedbackPromptDismissedAt === null && (history.length >= 5 || accountAgeDays >= 7);

  // Switching away from a dirty Templates editor without saving loses
  // whatever's currently unsaved — same warning TemplateEditor's own
  // Cancel button shows, triggered here because a tab click bypasses that
  // button entirely (see components/templates/TemplateEditor.tsx's
  // onDirtyChange callback, threaded through TemplateList).
  function handleTabChange(nextTab: Tab) {
    if (activeTab === "templates" && templatesEditorDirty && nextTab !== "templates") {
      setPendingTabSwitch(nextTab);
      return;
    }
    if (nextTab !== "plan") setTemplateUseSuccess(null);
    if (nextTab === "exercises") setVisitedExercisesTab(true);
    setActiveTab(nextTab);
  }

  // PART 1: called when the user finishes or skips the onboarding checklist
  // — either way it's permanent (profiles.onboarding_completed), so it
  // never reappears. Uses the profile repository directly (not the
  // Repositories bundle) since onboarding/profile state has always lived
  // there — see fetchProfileExtras above and app/account's ProfileForm.
  function handleCompleteOnboarding() {
    if (reposState.status !== "ready") return;
    setShowOnboarding(false);
    createSupabaseProfileRepository(createClient())
      .upsertProfile(reposState.userId, { onboardingCompleted: true })
      .catch(() => {
        // Best-effort — worst case onboarding reappears next session, which
        // is a minor annoyance, not a broken state.
      });
  }

  // PART 5: "Never ask again if dismissed" — recorded permanently the same
  // way as onboarding completion, whether the user rated or explicitly
  // dismissed the prompt.
  function handleDismissRatingPrompt() {
    if (reposState.status !== "ready") return;
    const dismissedAt = new Date().toISOString();
    setFeedbackPromptDismissedAt(dismissedAt);
    createSupabaseProfileRepository(createClient())
      .upsertProfile(reposState.userId, { feedbackPromptDismissedAt: dismissedAt })
      .catch(() => {});
  }

  async function handleSubmitRating(rating: number, comment: string) {
    if (reposState.status !== "ready") return;
    const { repositories, userId } = reposState;

    await repositories.feedback.submitFeedback(userId, {
      type: "rating",
      message: comment.trim() || null,
      rating,
      page: activeTab,
      appVersion: APP_VERSION,
      userAgent: navigator.userAgent,
      screenshotPath: null,
    });
    handleDismissRatingPrompt();
  }

  return (
    <main
      className={`mx-auto flex min-h-screen w-full max-w-[var(--page-max-width)] flex-col px-4 sm:px-6 ${
        settings.compactMode ? "gap-4 pt-5 pb-20 sm:gap-5 sm:pt-7 sm:pb-7" : "gap-6 pt-8 pb-24 sm:gap-8 sm:pt-12 sm:pb-12"
      }`}
    >
      <ThemeEffect settings={settings} />
      <AppHeader activeTab={activeTab} onTabChange={handleTabChange} hasActiveWorkout={activeWorkout !== null} variant="app" />

      <Disclaimer />
      <OfflineBanner />
      <MigrationBanner />

      {saveError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-[var(--control-radius)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex flex-col items-start gap-1.5">
            <p>{saveError}</p>
            {isSessionExpiredMessage(saveError) && (
              <button
                type="button"
                onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)}
                className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Log in again
              </button>
            )}
          </div>
          <button
            onClick={() => setSaveError(null)}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-danger transition hover:bg-danger-soft"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === "plan" && templateUseSuccess && (
        <div className="flex items-start justify-between gap-3 rounded-[var(--control-radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          <p>{templateUseSuccess}</p>
          <button
            onClick={() => setTemplateUseSuccess(null)}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-accent transition hover:bg-accent-soft"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <AppErrorBoundary
        key={selectedExercise ? "exercise-progress" : activeTab}
        componentName={selectedExercise ? "ExerciseProgressDetail" : activeTab}
        onReturnHome={() => {
          setSelectedExercise(null);
          setActiveTab("dashboard");
        }}
      >
      {selectedExercise ? (
        <ExerciseProgressDetail
          exerciseName={selectedExercise}
          history={history}
          weightUnit={settings.weightUnit}
          onBack={() => setSelectedExercise(null)}
        />
      ) : (
        <>
          {activeTab === "dashboard" && showOnboarding && (
            <OnboardingChecklist
              hasGeneratedPlan={hasGeneratedBefore}
              hasStartedWorkout={activeWorkout !== null || history.length > 0}
              hasLoggedSet={activeWorkout?.exercises.some((e) => e.sets.some((s) => s.completed)) || history.length > 0}
              hasViewedProgress={history.length > 0}
              hasVisitedLibrary={visitedExercisesTab}
              onNavigate={handleTabChange}
              onSkip={handleCompleteOnboarding}
              onAllStepsComplete={handleCompleteOnboarding}
            />
          )}

          {activeTab === "dashboard" && (
            <Dashboard
              plan={currentPlan}
              activeWorkout={activeWorkout}
              history={history}
              goals={goals}
              substitutionHistory={substitutionHistory}
              weightUnit={settings.weightUnit}
              weeklyTarget={weeklyTarget}
              displayName={displayName}
              onStartWorkout={handleStartWorkout}
              onResumeWorkout={() => setActiveTab("workout")}
              onGoToPlan={() => setActiveTab("plan")}
              onGoToInsights={() => setActiveTab("insights")}
              onGoToTemplates={() => setActiveTab("templates")}
              onViewHistoryEntry={(id) => {
                setSelectedHistoryId(id);
                setActiveTab("history");
              }}
              onSelectExercise={setSelectedExercise}
            />
          )}

          {activeTab === "plan" && (
            <>
              {view.status === "form" && (
                <>
                  {!hasGeneratedBefore && <EmptyState />}
                  <OnboardingForm initialValues={formValues} onSubmit={generatePlan} />
                </>
              )}

              {view.status === "loading" && <LoadingState />}

              {view.status === "declined" && (
                <ErrorState
                  title="We can't generate a plan for this"
                  message={view.message}
                  onRetry={() => setView({ status: "form" })}
                  retryLabel="Edit my answers"
                />
              )}

              {view.status === "error" && (
                <ErrorState
                  title="Something went wrong"
                  message={view.message}
                  onRetry={() => generatePlan(formValues)}
                  retryLabel="Try again"
                />
              )}

              {view.status === "plan" && (
                <WorkoutPlanView
                  plan={view.plan}
                  availableEquipment={formValues.equipment}
                  onRegenerate={() => generatePlan(formValues)}
                  onEditPreferences={() => setView({ status: "form" })}
                  onStartOver={handleStartOver}
                  onStartWorkout={handleStartWorkout}
                  onReplaceExercise={handleReplaceExercise}
                  onSavePlanEdits={handleSavePlanEdits}
                  onApplyEquipmentReplacements={handleApplyEquipmentReplacements}
                  onSaveAsTemplate={handleOpenSaveAsTemplate}
                  hasActiveWorkout={activeWorkout !== null}
                />
              )}
            </>
          )}

          {activeTab === "workout" && activeWorkout && (
            <>
              {pendingCompletion ? (
                <PostWorkoutCheckIn onSave={finalizeWorkout} onSkip={() => finalizeWorkout(null)} />
              ) : (
                <ActiveWorkoutView
                  workout={activeWorkout}
                  history={history}
                  settings={settings}
                  onUpdateWorkout={handleUpdateActiveWorkout}
                  onToggleAutoStart={(enabled) => handleUpdateSettings({ autoStartRestTimer: enabled })}
                  onFinish={handleFinishWorkout}
                  onDiscard={handleDiscardWorkout}
                  onSelectExercise={setSelectedExercise}
                />
              )}
            </>
          )}

          {activeTab === "history" && (
            <WorkoutHistory
              history={history}
              recentPRs={recentPRs}
              weightUnit={settings.weightUnit}
              selectedId={selectedHistoryId}
              onSelect={setSelectedHistoryId}
              onDismissPRs={() => setRecentPRs([])}
              onSelectExercise={setSelectedExercise}
            />
          )}

          {activeTab === "insights" && (
            <InsightsPage
              history={history}
              plan={currentPlan}
              settings={settings}
              substitutionHistory={substitutionHistory}
              goals={goals}
              onSelectExercise={setSelectedExercise}
              onGoToPlan={() => setActiveTab("plan")}
              onCreateGoal={handleCreateGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === "templates" && (
            <TemplateList
              templates={templates}
              hasActivePlan={hasGeneratedBefore}
              history={history}
              weightUnit={settings.weightUnit}
              favoriteExerciseIds={favoriteExerciseIds}
              onToggleExerciseFavorite={handleToggleExerciseFavorite}
              onCreate={handleCreateTemplate}
              onUpdate={handleUpdateTemplate}
              onDelete={handleDeleteTemplate}
              onDuplicate={handleDuplicateTemplate}
              onLoadTemplate={handleLoadTemplate}
              onUseTemplate={handleUseTemplate}
              onToggleFavorite={handleToggleFavorite}
              onDirtyChange={setTemplatesEditorDirty}
            />
          )}

          {activeTab === "exercises" && (
            <ExerciseLibraryBrowser
              history={history}
              weightUnit={settings.weightUnit}
              favoriteIds={favoriteExerciseIds}
              onToggleFavorite={handleToggleExerciseFavorite}
            />
          )}

          {showSaveAsTemplate && (
            <SaveAsTemplateDialog
              saving={savingTemplate}
              errorMessage={saveTemplateError}
              onSave={handleSaveAsTemplate}
              onCancel={() => setShowSaveAsTemplate(false)}
            />
          )}

          {pendingTabSwitch && (
            <UnsavedChangesDialog
              onDiscard={() => {
                setTemplatesEditorDirty(false);
                setActiveTab(pendingTabSwitch);
                setPendingTabSwitch(null);
              }}
              onKeepEditing={() => setPendingTabSwitch(null)}
            />
          )}

          {activeTab === "settings" && (
            <SettingsPanel
              settings={settings}
              hasActiveWorkout={activeWorkout !== null}
              onUpdateSettings={handleUpdateSettings}
              onClearActiveWorkout={handleClearActiveWorkoutFromSettings}
            />
          )}
        </>
      )}
      </AppErrorBoundary>

      <FeedbackButton currentPage={activeTab} />

      {shouldShowRatingPrompt && activeTab === "dashboard" && (
        <RatingPrompt onSubmit={handleSubmitRating} onDismiss={handleDismissRatingPrompt} />
      )}
    </main>
  );
}
