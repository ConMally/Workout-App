"use client";

import { useMemo } from "react";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { createClient } from "@/lib/supabase/client";
import { createSupabaseRepositories } from "./supabase";
import type { Repositories } from "./types";

export type RepositoriesState =
  | { status: "loading" }
  // No session — this app has no guest/local-only mode. Callers must never
  // treat this as "safe to read/write local data" and must never fall back
  // to a local repository bundle here; the only correct response is to
  // route the visitor to /login (proxy.ts already does this server-side for
  // the initial request — this variant exists for the client-side case
  // where a session expires/is revoked after the page has already mounted).
  | { status: "unauthenticated" }
  | { status: "ready"; mode: "cloud"; userId: string; repositories: Repositories };

// The single place that resolves Supabase-backed repositories for the whole
// app, keyed off the same session useAuthStatus already tracks. Nothing
// else should branch on auth status to pick a data source or call Supabase
// directly — see lib/repositories/types.ts.
//
// While the initial session check is in flight ("loading"), this returns
// {status: "loading"} rather than resolving anything — reading data before
// we know whether the visitor is signed in risks briefly showing another
// account's data (or none) right before the real fetch replaces it.
// Callers should render a loading state for that case, and a
// redirect-to-login state for "unauthenticated" (never rendered app
// content — see the RepositoriesState doc above).
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

    return { status: "unauthenticated" };
  }, [status, userId, cloudRepositories]);
}
