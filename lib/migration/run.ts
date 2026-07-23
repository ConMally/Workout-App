import { detectPersonalRecords } from "@/lib/progression";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import type { Repositories } from "@/lib/repositories/types";
import type { DatedPersonalRecord } from "@/types/dashboard";
import type { CompletedWorkout } from "@/types/workout-log";
import type { LocalSnapshot } from "./local-snapshot";
import type { MigrationChoices, MigrationCounts, MigrationDomain, MigrationOutcome, MigrationStage } from "./types";
import { updateMigrationStage } from "./status";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function bump(counts: MigrationCounts, domain: MigrationDomain, by = 1): void {
  counts[domain] = (counts[domain] ?? 0) + by;
}

export interface MigrationRunHandle {
  onStage?: (stage: MigrationStage) => void;
}

// Runs every stage against a Supabase-backed Repositories bundle (the same
// one app/page.tsx uses for a signed-in user), so every write goes through
// the exact same validated, RLS-scoped code path as normal app usage —
// nothing here talks to Supabase directly except migration_status's own
// stage-tracking calls. Each stage is independently try/caught: one
// domain's failure doesn't stop the others, and the run always finishes
// with a status reflecting whether anything actually failed rather than
// assuming success.
export async function runMigration(
  client: SupabaseClient<Database>,
  repositories: Repositories,
  userId: string,
  snapshot: LocalSnapshot,
  choices: MigrationChoices,
  handle?: MigrationRunHandle
): Promise<MigrationOutcome> {
  const imported: MigrationCounts = {};
  const skipped: MigrationCounts = {};
  const failed: MigrationCounts = {};
  let firstError: string | null = null;

  function recordFailure(domain: MigrationDomain, error: unknown) {
    bump(failed, domain);
    if (!firstError) firstError = getFriendlyDataErrorMessage(error);
  }

  async function stage(name: MigrationStage, fn: () => Promise<void>) {
    handle?.onStage?.(name);
    await updateMigrationStage(client, userId, name);
    await fn();
  }

  // --- settings -------------------------------------------------------
  await stage("settings", async () => {
    if (choices.settings !== "device" || !snapshot.hasStoredSettings) {
      bump(skipped, "settings");
      return;
    }
    try {
      await repositories.settings.saveSettings(userId, snapshot.settings);
      bump(imported, "settings");
    } catch (error) {
      recordFailure("settings", error);
    }
  });

  // --- plan -------------------------------------------------------------
  await stage("plan", async () => {
    if (!snapshot.plan) return;
    try {
      const cloudPlan = await repositories.plan.getActivePlan(userId);
      if (!cloudPlan || snapshot.plan.savedAt > cloudPlan.savedAt) {
        await repositories.plan.saveActivePlan(userId, snapshot.plan);
        bump(imported, "plan");
      } else {
        bump(skipped, "plan");
      }
    } catch (error) {
      recordFailure("plan", error);
    }
  });

  // --- substitutions ------------------------------------------------------
  await stage("substitutions", async () => {
    if (Object.keys(snapshot.substitutions).length === 0) return;
    try {
      const cloudSubs = await repositories.substitutions.getSubstitutionHistory(userId);
      if (Object.keys(cloudSubs).length === 0) {
        await repositories.substitutions.saveSubstitutionHistory(userId, snapshot.substitutions);
        bump(imported, "substitutions");
      } else {
        bump(skipped, "substitutions");
      }
    } catch (error) {
      recordFailure("substitutions", error);
    }
  });

  // --- goals --------------------------------------------------------------
  await stage("goals", async () => {
    if (snapshot.goals.length === 0) return;
    try {
      const existingGoals = await repositories.goals.listGoals(userId);
      const existingIds = new Set(existingGoals.map((goal) => goal.id));

      for (const goal of snapshot.goals) {
        if (existingIds.has(goal.id)) {
          bump(skipped, "goals");
          continue;
        }
        try {
          await repositories.goals.createGoal(userId, goal);
          bump(imported, "goals");
        } catch (error) {
          recordFailure("goals", error);
        }
      }
    } catch (error) {
      // Couldn't even list existing goals — treat every local goal as failed
      // rather than guessing at duplicates.
      recordFailure("goals", error);
    }
  });

  // --- history (+ readiness, + re-derived PRs) -----------------------------
  await stage("history", async () => {
    if (snapshot.history.length === 0) return;

    // Local history is stored newest-first; PR detection needs to walk
    // oldest-first so each workout is judged against everything genuinely
    // before it, exactly like a live completion would be.
    const chronological = [...snapshot.history].reverse();
    const priorHistory: CompletedWorkout[] = [];

    for (const workout of chronological) {
      try {
        const existing = await repositories.history.getCompletedWorkout(userId, workout.id);
        if (existing) {
          bump(skipped, "history");
          priorHistory.push(workout);
          continue;
        }

        await repositories.history.addCompletedWorkout(userId, workout);
        bump(imported, "history");
        if (workout.readiness !== null) bump(imported, "readiness");

        const events = detectPersonalRecords(priorHistory, workout);
        if (events.length > 0) {
          const dated: DatedPersonalRecord[] = events.map((event) => ({
            ...event,
            completedAt: workout.completedAt,
          }));
          try {
            await repositories.personalRecords.recordPersonalRecords(userId, workout.id, dated);
            bump(imported, "personalRecords", dated.length);
          } catch (error) {
            recordFailure("personalRecords", error);
          }
        }
      } catch (error) {
        recordFailure("history", error);
      }

      priorHistory.push(workout);
    }
  });

  // --- active workout -------------------------------------------------------
  await stage("active_workout", async () => {
    if (!snapshot.activeWorkout) return;
    try {
      const cloudActive = await repositories.activeWorkout.getActiveWorkout(userId);

      if (!cloudActive) {
        await repositories.activeWorkout.createActiveWorkout(userId, snapshot.activeWorkout);
        bump(imported, "activeWorkout");
        return;
      }

      if (choices.activeWorkout === "device") {
        await repositories.activeWorkout.clearActiveWorkout(userId);
        await repositories.activeWorkout.createActiveWorkout(userId, snapshot.activeWorkout);
        bump(imported, "activeWorkout");
      } else {
        bump(skipped, "activeWorkout");
      }
    } catch (error) {
      recordFailure("activeWorkout", error);
    }
  });

  const hasAnyFailure = Object.values(failed).some((count) => (count ?? 0) > 0);

  return {
    status: hasAnyFailure ? "partially_failed" : "completed",
    imported,
    skipped,
    failed,
    errorSummary: firstError,
  };
}
