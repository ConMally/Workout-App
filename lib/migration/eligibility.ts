"use client";

import { useEffect, useState } from "react";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { useRepositories } from "@/lib/repositories/useRepositories";
import { createClient } from "@/lib/supabase/client";
import { readLocalSnapshot, hasAnyLocalData, type LocalSnapshot } from "./local-snapshot";
import { buildMigrationPreview } from "./preview";
import { getMigrationStatus } from "./status";
import type { MigrationPreview, MigrationStatusRow, MigrationStatusValue } from "./types";

// Section 2's three rules: valid local data exists, the user hasn't
// already completed or permanently declined migration, and nothing is
// currently running for them.
const OFFERABLE_STATUSES: MigrationStatusValue[] = ["not_started", "offered", "deferred", "partially_failed"];

export function isMigrationEligible(statusRow: MigrationStatusRow | null, hasLocalData: boolean): boolean {
  if (!hasLocalData || !statusRow) return false;
  return OFFERABLE_STATUSES.includes(statusRow.status);
}

export interface MigrationOfferState {
  loading: boolean;
  eligible: boolean;
  snapshot: LocalSnapshot | null;
  preview: MigrationPreview | null;
  statusRow: MigrationStatusRow | null;
  refresh: () => void;
}

// Shared by MigrationBanner and MigrationPanel so both agree on the same
// snapshot/preview/status without each re-implementing the fetch. Only
// ever produces a non-loading, non-empty result for a signed-in, cloud-mode
// session — signed-out visitors and the brief auth-resolving window always
// resolve to "not eligible" rather than reading localStorage speculatively.
export function useMigrationOffer(): MigrationOfferState {
  const { status: authStatus, userId } = useAuthStatus();
  const reposState = useRepositories();
  const [state, setState] = useState<MigrationOfferState>({
    loading: true,
    eligible: false,
    snapshot: null,
    preview: null,
    statusRow: null,
    refresh: () => {},
  });
  const [nonce, setNonce] = useState(0);

  // A data-loading effect keyed on account identity (auth status + repos +
  // an explicit refresh nonce), same shape as app/page.tsx's main load
  // effect — some branches set state synchronously (loading/empty-state
  // resets) rather than only inside the async fetch, which is what this
  // rule normally guards against turning into a sync-state-mirror
  // antipattern. Here it's genuine one-shot fetch orchestration, not state
  // mirroring.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authStatus === "loading" || reposState.status !== "ready") {
      setState((prev) => ({ ...prev, loading: true }));
      return;
    }

    if (authStatus !== "signed-in" || !userId || reposState.mode !== "cloud") {
      setState({
        loading: false,
        eligible: false,
        snapshot: null,
        preview: null,
        statusRow: null,
        refresh: () => setNonce((n) => n + 1),
      });
      return;
    }

    const { repositories } = reposState;
    const uid = userId;
    let cancelled = false;

    async function load() {
      const snapshot = readLocalSnapshot();
      const hasLocal = hasAnyLocalData(snapshot);

      if (!hasLocal) {
        if (!cancelled) {
          setState({
            loading: false,
            eligible: false,
            snapshot,
            preview: null,
            statusRow: null,
            refresh: () => setNonce((n) => n + 1),
          });
        }
        return;
      }

      try {
        const client = createClient();
        const [statusRow, cloudPlan, cloudActive, cloudSubs] = await Promise.all([
          getMigrationStatus(client, uid),
          repositories.plan.getActivePlan(uid),
          repositories.activeWorkout.getActiveWorkout(uid),
          repositories.substitutions.getSubstitutionHistory(uid),
        ]);

        if (cancelled) return;

        const preview = buildMigrationPreview(snapshot, {
          hasPlan: cloudPlan !== null,
          hasActiveWorkout: cloudActive !== null,
          hasSubstitutions: Object.keys(cloudSubs).length > 0,
        });

        setState({
          loading: false,
          eligible: isMigrationEligible(statusRow, hasLocal),
          snapshot,
          preview,
          statusRow,
          refresh: () => setNonce((n) => n + 1),
        });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            eligible: false,
            snapshot,
            preview: null,
            statusRow: null,
            refresh: () => setNonce((n) => n + 1),
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authStatus, userId, reposState, nonce]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return state;
}
