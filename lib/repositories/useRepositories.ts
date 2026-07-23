"use client";

import { useMemo } from "react";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { createClient } from "@/lib/supabase/client";
import { localRepositories } from "./local";
import { createSupabaseRepositories } from "./supabase";
import type { Repositories } from "./types";

export type RepositoriesState =
  | { status: "loading" }
  | { status: "ready"; mode: "local"; userId: null; repositories: Repositories }
  | { status: "ready"; mode: "cloud"; userId: string; repositories: Repositories };

// The single place that decides local vs. Supabase-backed repositories for
// the whole app, keyed off the same session useAuthStatus already tracks.
// Nothing else should branch on auth status to pick a data source or call
// Supabase directly — see lib/repositories/types.ts.
//
// While the initial session check is in flight ("loading"), this returns
// {status: "loading"} rather than falling back to local repositories —
// reading localStorage before we know whether the visitor is signed in
// risks briefly showing anonymous data that a signed-in fetch is about to
// replace. Callers should render a loading state for that case.
//
// The returned object is itself memoized (stable reference whenever
// status/userId/repositories haven't changed) specifically so callers can
// drop it straight into a data-loading effect's dependency array — e.g.
// `useEffect(() => { ...refetch... }, [reposState])` in app/page.tsx — and
// have that effect fire exactly once per real account change (including
// sign-in, sign-out, and switching to a different account) rather than on
// every render.
export function useRepositories(): RepositoriesState {
  const { status, userId } = useAuthStatus();

  // Recreated only when the signed-in user id changes (or the session
  // transitions to/from signed-out) — never reused across different users,
  // so nothing from a previous account can leak into a freshly built
  // client/repository bundle after an account switch.
  const cloudRepositories = useMemo(() => {
    if (status !== "signed-in" || !userId) return null;
    return createSupabaseRepositories(createClient());
  }, [status, userId]);

  return useMemo<RepositoriesState>(() => {
    if (status === "loading") {
      return { status: "loading" };
    }

    if (status === "signed-in" && userId && cloudRepositories) {
      return { status: "ready", mode: "cloud", userId, repositories: cloudRepositories };
    }

    return { status: "ready", mode: "local", userId: null, repositories: localRepositories };
  }, [status, userId, cloudRepositories]);
}
