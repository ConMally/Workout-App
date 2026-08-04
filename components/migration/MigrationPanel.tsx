"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { useRepositories } from "@/lib/repositories/useRepositories";
import { useMigrationOffer } from "@/lib/migration/eligibility";
import {
  claimMigrationLock,
  completeMigration,
  markDeferred,
  markDeclined,
  getMigrationChannel,
  type MigrationBroadcastMessage,
} from "@/lib/migration/status";
import { runMigration } from "@/lib/migration/run";
import { createClient } from "@/lib/supabase/client";
import { exportAllData, clearAllLocalAppData } from "@/lib/storage";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import Button from "@/components/ui/Button";
import type {
  ActiveWorkoutChoice,
  MigrationChoices,
  MigrationCounts,
  MigrationOutcome,
  MigrationStage,
  SettingsChoice,
} from "@/lib/migration/types";

const STAGE_LABELS: Record<MigrationStage, string> = {
  settings: "Settings",
  plan: "Workout plan",
  substitutions: "Exercise swap history",
  goals: "Goals",
  history: "Workout history",
  active_workout: "Active workout",
};

const DOMAIN_LABELS: Record<string, string> = {
  settings: "Settings",
  plan: "Workout plan",
  substitutions: "Exercise swap history",
  goals: "Goals",
  history: "Completed workouts",
  readiness: "Readiness check-ins",
  personalRecords: "Personal records",
  activeWorkout: "Active workout",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function CountsList({ counts, prefix }: { counts: MigrationCounts; prefix: string }) {
  const entries = Object.entries(counts).filter(([, count]) => (count ?? 0) > 0);
  if (entries.length === 0) return <p className="text-xs text-text-muted">{prefix} nothing</p>;
  return (
    <ul className="text-xs text-text-secondary">
      {entries.map(([domain, count]) => (
        <li key={domain}>
          {prefix} {DOMAIN_LABELS[domain] ?? domain}: {count}
        </li>
      ))}
    </ul>
  );
}

type Phase = "idle" | "running" | "outcome" | "cleanup" | "done";

export default function MigrationPanel() {
  const { userId } = useAuthStatus();
  const reposState = useRepositories();
  const offer = useMigrationOffer();

  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<MigrationStage | null>(null);
  const [outcome, setOutcome] = useState<MigrationOutcome | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [otherTabFinished, setOtherTabFinished] = useState(false);
  const [otherTabRunning, setOtherTabRunning] = useState(false);
  const [settingsChoice, setSettingsChoice] = useState<SettingsChoice>("cloud");
  const [activeWorkoutChoice, setActiveWorkoutChoice] = useState<ActiveWorkoutChoice>("cloud");
  const [busy, setBusy] = useState(false);
  const [exported, setExported] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Same-device cross-tab awareness only — the real guard against two tabs
  // migrating at once is claimMigrationLock's conditional database UPDATE
  // (see lib/migration/status.ts). This just makes the UI reflect reality
  // sooner than a manual refresh would.
  useEffect(() => {
    const channel = getMigrationChannel();
    channelRef.current = channel;
    if (!channel || !userId) return;

    function handleMessage(event: MessageEvent<MigrationBroadcastMessage>) {
      const msg = event.data;
      if (msg.userId !== userId) return;
      if (msg.type === "started") setOtherTabRunning(true);
      if (msg.type === "finished") {
        setOtherTabRunning(false);
        setOtherTabFinished(true);
      }
    }

    channel.addEventListener("message", handleMessage);
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [userId]);

  async function startImport() {
    if (!userId || reposState.status !== "ready" || reposState.mode !== "cloud" || !offer.snapshot) return;

    setLockError(null);
    setBusy(true);

    const client = createClient();
    const claim = await claimMigrationLock(client, userId, offer.snapshot.storageVersion);
    if (!claim.claimed) {
      setLockError("Import is already in progress for this account — try again in a moment.");
      setBusy(false);
      return;
    }

    channelRef.current?.postMessage({
      type: "started",
      userId,
      batchId: claim.batchId,
    } satisfies MigrationBroadcastMessage);

    setPhase("running");
    setStage(null);

    const choices: MigrationChoices = { settings: settingsChoice, activeWorkout: activeWorkoutChoice };

    let result: MigrationOutcome;
    try {
      result = await runMigration(client, reposState.repositories, userId, offer.snapshot, choices, {
        onStage: setStage,
      });
      await completeMigration(client, userId, result);
    } catch (error) {
      result = {
        status: "partially_failed",
        imported: {},
        skipped: {},
        failed: {},
        errorSummary: getFriendlyDataErrorMessage(error),
      };
      try {
        await completeMigration(client, userId, result);
      } catch {
        // Best-effort — the status row write itself failed (e.g. the
        // session expired mid-import). Local data is untouched either way,
        // and re-opening this page will offer a retry once reconnected.
      }
    }

    channelRef.current?.postMessage({
      type: "finished",
      userId,
      status: result.status,
    } satisfies MigrationBroadcastMessage);

    setOutcome(result);
    setPhase(result.status === "completed" ? "cleanup" : "outcome");
    setBusy(false);
  }

  async function handleDefer() {
    if (!userId) return;
    setBusy(true);
    try {
      await markDeferred(createClient(), userId);
      // Deferred stays offerable on a future visit (see OFFERABLE_STATUSES)
      // — re-fetching now would just show this exact same screen again, so
      // switch to a local acknowledgment instead of calling offer.refresh().
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!userId) return;
    if (
      !window.confirm(
        "This keeps your account empty of the data on this device. This choice is remembered — you won't be asked again."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await markDeclined(createClient(), userId);
      offer.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-app-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(true);
  }

  function handleClearLocal() {
    if (!window.confirm("Remove the workout data stored on this device? Your account's data is unaffected.")) return;
    clearAllLocalAppData();
    setPhase("done");
  }

  if (offer.loading) return null;

  // Already resolved outcomes from a prior visit — no local snapshot needed.
  if (!offer.eligible && phase === "idle") {
    if (offer.statusRow?.status === "completed") {
      return (
        <div className="rounded-[var(--control-radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          Your device data was imported into this account
          {offer.statusRow.completedAt ? ` on ${formatDate(offer.statusRow.completedAt)}` : ""}.
        </div>
      );
    }
    if (offer.statusRow?.status === "declined") {
      return (
        <div className="rounded-[var(--control-radius)] border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary">
          You chose not to import data from this device into this account.
        </div>
      );
    }
    return null;
  }

  const preview = offer.preview;
  if (!preview) return null;

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h3 className="text-section-heading text-text-primary">Device data found</h3>

      {phase === "idle" && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="rounded-[var(--control-radius)] bg-warning-soft px-3 py-2 text-sm text-warning">
            This browser contains workout data created before sign-in. Import it only if it belongs to you.
          </div>

          {offer.statusRow?.status === "partially_failed" && (
            <div className="rounded-[var(--control-radius)] bg-warning-soft px-3 py-2 text-xs text-warning">
              A previous import attempt didn&apos;t fully complete. Trying again will pick up only what&apos;s
              missing — nothing already imported will be duplicated.
            </div>
          )}

          {otherTabRunning && (
            <div className="rounded-[var(--control-radius)] bg-warning-soft px-3 py-2 text-xs text-warning">
              Migration appears to be running in another tab right now.
            </div>
          )}

          {otherTabFinished && (
            <div className="rounded-[var(--control-radius)] bg-accent-soft px-3 py-2 text-xs text-accent">
              Migration finished in another tab.{" "}
              <button type="button" onClick={() => offer.refresh()} className="font-semibold underline">
                Refresh this view
              </button>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-text-muted">Saved plan</dt>
              <dd className="font-medium text-text-primary">{preview.hasPlan ? "Yes" : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Active workout</dt>
              <dd className="font-medium text-text-primary">{preview.hasActiveWorkout ? "Yes" : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Completed workouts</dt>
              <dd className="font-medium text-text-primary">{preview.completedWorkoutCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Completed sets</dt>
              <dd className="font-medium text-text-primary">{preview.completedSetCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Personal records</dt>
              <dd className="font-medium text-text-primary">{preview.prCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Goals</dt>
              <dd className="font-medium text-text-primary">{preview.goalCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Readiness check-ins</dt>
              <dd className="font-medium text-text-primary">{preview.readinessCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Settings</dt>
              <dd className="font-medium text-text-primary">{preview.hasStoredSettings ? "Customized" : "Default"}</dd>
            </div>
            {preview.historyDateRange && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-text-muted">History date range</dt>
                <dd className="font-medium text-text-primary">
                  {formatDate(preview.historyDateRange.earliest)} – {formatDate(preview.historyDateRange.latest)}
                </dd>
              </div>
            )}
          </dl>

          {preview.hasStoredSettings && (
            <div>
              <p className="text-sm font-medium text-text-primary">Settings</p>
              <p className="text-xs text-text-muted">Your account already has settings. Which should be used?</p>
              <div className="mt-2 flex gap-1 rounded-[var(--control-radius)] border border-border p-1">
                {(
                  [
                    { value: "cloud", label: "Keep account settings" },
                    { value: "device", label: "Use device settings" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSettingsChoice(option.value)}
                    aria-pressed={settingsChoice === option.value}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      settingsChoice === option.value ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-surface-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {preview.hasActiveWorkout && preview.cloud.hasActiveWorkout && (
            <div>
              <p className="text-sm font-medium text-text-primary">Active workout conflict</p>
              <p className="text-xs text-text-muted">
                Your account already has an active workout in progress. Only one can be active at a time.
              </p>
              <div className="mt-2 flex gap-1 rounded-[var(--control-radius)] border border-border p-1">
                {(
                  [
                    { value: "cloud", label: "Keep account's active workout" },
                    { value: "device", label: "Import device's active workout" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveWorkoutChoice(option.value)}
                    aria-pressed={activeWorkoutChoice === option.value}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      activeWorkoutChoice === option.value
                        ? "bg-accent text-accent-foreground"
                        : "text-text-secondary hover:bg-surface-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-text-muted">
            Importing copies this device&apos;s data into your account. Nothing already in your account is silently
            overwritten. Local data stays on this device until you choose to clear it, and import can be retried if
            it fails partway.
          </p>

          {lockError && <p className="rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-xs text-danger">{lockError}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={startImport} disabled={busy || otherTabRunning}>
              Import into this account
            </Button>
            <Button type="button" variant="secondary" onClick={handleDecline} disabled={busy}>
              Keep this account empty
            </Button>
            <Button type="button" variant="secondary" onClick={handleDefer} disabled={busy}>
              Decide later
            </Button>
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-3 flex items-center gap-3 text-sm text-text-secondary">
          <span
            className="h-4 w-4 flex-shrink-0 motion-safe:animate-spin rounded-full border-2 border-accent border-t-transparent"
            aria-hidden="true"
          />
          Importing{stage ? ` — ${STAGE_LABELS[stage]}` : "…"}
        </div>
      )}

      {phase === "outcome" && outcome && (
        <div className="mt-3 flex flex-col gap-3">
          <div
            className={`rounded-[var(--control-radius)] px-3 py-2 text-sm ${
              outcome.status === "completed" ? "bg-accent-soft text-accent" : "bg-warning-soft text-warning"
            }`}
          >
            {outcome.status === "completed"
              ? "Import complete."
              : "Import finished with some items not yet imported. You can retry — nothing already imported will be duplicated."}
          </div>
          {outcome.errorSummary && <p className="text-xs text-danger">{outcome.errorSummary}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Imported</p>
              <CountsList counts={outcome.imported} prefix="" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">Skipped</p>
              <CountsList counts={outcome.skipped} prefix="" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">Failed</p>
              <CountsList counts={outcome.failed} prefix="" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="primary" onClick={startImport} disabled={busy}>
              Retry
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPhase("done")}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {phase === "cleanup" && outcome && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-[var(--control-radius)] bg-accent-soft px-3 py-2 text-sm text-accent">
            Import succeeded. What would you like to do with the data still stored on this device?
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Imported</p>
              <CountsList counts={outcome.imported} prefix="" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">Skipped (already in account)</p>
              <CountsList counts={outcome.skipped} prefix="" />
            </div>
          </div>
          {exported && <p className="text-xs text-accent">Export downloaded.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleExport}>
              Export first
            </Button>
            <Button type="button" variant="destructive" onClick={handleClearLocal}>
              Clear device-only data
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPhase("done")}>
              Keep a local backup
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <p className="mt-3 text-sm text-text-secondary">
          {outcome
            ? "Your account's data is up to date."
            : "We'll ask again next time you visit this page."}{" "}
          <button type="button" onClick={() => offer.refresh()} className="font-semibold text-accent underline">
            Refresh
          </button>
        </p>
      )}
    </div>
  );
}
