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
  if (entries.length === 0) return <p className="text-xs text-slate-500">{prefix} nothing</p>;
  return (
    <ul className="text-xs text-slate-600">
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
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Your device data was imported into this account
          {offer.statusRow.completedAt ? ` on ${formatDate(offer.statusRow.completedAt)}` : ""}.
        </div>
      );
    }
    if (offer.statusRow?.status === "declined") {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          You chose not to import data from this device into this account.
        </div>
      );
    }
    return null;
  }

  const preview = offer.preview;
  if (!preview) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Device data found</h3>

      {phase === "idle" && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This browser contains workout data created before sign-in. Import it only if it belongs to you.
          </div>

          {offer.statusRow?.status === "partially_failed" && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              A previous import attempt didn&apos;t fully complete. Trying again will pick up only what&apos;s
              missing — nothing already imported will be duplicated.
            </div>
          )}

          {otherTabRunning && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Migration appears to be running in another tab right now.
            </div>
          )}

          {otherTabFinished && (
            <div className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">
              Migration finished in another tab.{" "}
              <button type="button" onClick={() => offer.refresh()} className="font-semibold underline">
                Refresh this view
              </button>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Saved plan</dt>
              <dd className="font-medium text-slate-800">{preview.hasPlan ? "Yes" : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Active workout</dt>
              <dd className="font-medium text-slate-800">{preview.hasActiveWorkout ? "Yes" : "None"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Completed workouts</dt>
              <dd className="font-medium text-slate-800">{preview.completedWorkoutCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Completed sets</dt>
              <dd className="font-medium text-slate-800">{preview.completedSetCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Personal records</dt>
              <dd className="font-medium text-slate-800">{preview.prCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Goals</dt>
              <dd className="font-medium text-slate-800">{preview.goalCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Readiness check-ins</dt>
              <dd className="font-medium text-slate-800">{preview.readinessCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Settings</dt>
              <dd className="font-medium text-slate-800">{preview.hasStoredSettings ? "Customized" : "Default"}</dd>
            </div>
            {preview.historyDateRange && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-slate-500">History date range</dt>
                <dd className="font-medium text-slate-800">
                  {formatDate(preview.historyDateRange.earliest)} – {formatDate(preview.historyDateRange.latest)}
                </dd>
              </div>
            )}
          </dl>

          {preview.hasStoredSettings && (
            <div>
              <p className="text-sm font-medium text-slate-800">Settings</p>
              <p className="text-xs text-slate-500">Your account already has settings. Which should be used?</p>
              <div className="mt-2 flex gap-1 rounded-lg border border-slate-200 p-1">
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
                      settingsChoice === option.value ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"
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
              <p className="text-sm font-medium text-slate-800">Active workout conflict</p>
              <p className="text-xs text-slate-500">
                Your account already has an active workout in progress. Only one can be active at a time.
              </p>
              <div className="mt-2 flex gap-1 rounded-lg border border-slate-200 p-1">
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
                        ? "bg-teal-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Importing copies this device&apos;s data into your account. Nothing already in your account is silently
            overwritten. Local data stays on this device until you choose to clear it, and import can be retried if
            it fails partway.
          </p>

          {lockError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{lockError}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startImport}
              disabled={busy || otherTabRunning}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import into this account
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep this account empty
            </button>
            <button
              type="button"
              onClick={handleDefer}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Decide later
            </button>
          </div>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
          <span
            className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
            aria-hidden="true"
          />
          Importing{stage ? ` — ${STAGE_LABELS[stage]}` : "…"}
        </div>
      )}

      {phase === "outcome" && outcome && (
        <div className="mt-3 flex flex-col gap-3">
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              outcome.status === "completed" ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"
            }`}
          >
            {outcome.status === "completed"
              ? "Import complete."
              : "Import finished with some items not yet imported. You can retry — nothing already imported will be duplicated."}
          </div>
          {outcome.errorSummary && <p className="text-xs text-red-700">{outcome.errorSummary}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Imported</p>
              <CountsList counts={outcome.imported} prefix="" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Skipped</p>
              <CountsList counts={outcome.skipped} prefix="" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Failed</p>
              <CountsList counts={outcome.failed} prefix="" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startImport}
              disabled={busy}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setPhase("done")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {phase === "cleanup" && outcome && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
            Import succeeded. What would you like to do with the data still stored on this device?
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Imported</p>
              <CountsList counts={outcome.imported} prefix="" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Skipped (already in account)</p>
              <CountsList counts={outcome.skipped} prefix="" />
            </div>
          </div>
          {exported && <p className="text-xs text-teal-700">Export downloaded.</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Export first
            </button>
            <button
              type="button"
              onClick={handleClearLocal}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Clear device-only data
            </button>
            <button
              type="button"
              onClick={() => setPhase("done")}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Keep a local backup
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <p className="mt-3 text-sm text-slate-600">
          {outcome
            ? "Your account's data is up to date."
            : "We'll ask again next time you visit this page."}{" "}
          <button type="button" onClick={() => offer.refresh()} className="font-semibold text-teal-700 underline">
            Refresh
          </button>
        </p>
      )}
    </div>
  );
}
