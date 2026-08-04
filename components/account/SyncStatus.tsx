"use client";

import { useEffect, useState } from "react";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { createClient } from "@/lib/supabase/client";
import { getMigrationStatus } from "@/lib/migration/status";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import type { MigrationStatusRow, MigrationStatusValue } from "@/lib/migration/types";

type State =
  | { phase: "loading" }
  | { phase: "ready"; migrationStatus: MigrationStatusRow | null }
  | { phase: "error"; message: string };

const MIGRATION_STATUS_LABELS: Record<MigrationStatusValue, string> = {
  not_started: "Not started",
  offered: "Offered — review below",
  deferred: "Deferred — you'll be asked again next visit",
  importing: "In progress",
  partially_failed: "Partially completed — some items still pending, retry below",
  completed: "Completed",
  declined: "Declined — this account stays empty of device data",
};

// Self-contained: fetches its own migration_status row via the client
// Supabase client (same trust model as everywhere else in this app — RLS
// enforces auth.uid() = user_id regardless of what userId this component
// passes). No account email/display-name/profile-field duplication here;
// those already live in ProfileForm below this component on /account —
// this is specifically about sync/migration status.
export default function SyncStatus() {
  const { status: authStatus, userId } = useAuthStatus();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [nonce, setNonce] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authStatus !== "signed-in" || !userId) return;

    let cancelled = false;
    setState({ phase: "loading" });

    getMigrationStatus(createClient(), userId)
      .then((migrationStatus) => {
        if (!cancelled) setState({ phase: "ready", migrationStatus });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ phase: "error", message: getFriendlyDataErrorMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, userId, nonce]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (authStatus !== "signed-in") return null;

  if (state.phase === "loading") {
    return (
      <div className="rounded-[var(--control-radius)] border border-border bg-surface-muted px-4 py-3 text-sm text-text-muted">
        Checking sync status…
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--control-radius)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <p>Couldn&apos;t confirm sync status — {state.message}</p>
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="font-semibold underline">
          Retry
        </button>
      </div>
    );
  }

  const migrationLabel = state.migrationStatus ? MIGRATION_STATUS_LABELS[state.migrationStatus.status] : "Unknown";

  return (
    <div className="rounded-[var(--control-radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
      <p className="flex items-center gap-2 font-medium">
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" aria-hidden="true" />
        Cloud sync active
      </p>
      <p className="mt-1">Your workout plans, history, goals, and progress are synced to this account.</p>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-xs text-accent sm:grid-cols-3">
        <div>
          <dt className="font-semibold uppercase tracking-wide text-accent">Data source</dt>
          <dd className="mt-0.5">This account (cloud)</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide text-accent">Last synced</dt>
          <dd className="mt-0.5">Just now</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide text-accent">Device data migration</dt>
          <dd className="mt-0.5">{migrationLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
