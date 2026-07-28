"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppNavigation, { type Tab } from "@/components/navigation/AppNavigation";
import AuthStatus from "@/components/auth/AuthStatus";
import { useRepositories } from "@/lib/repositories/useRepositories";

interface AppHeaderProps {
  activeTab: Tab;
  onTabChange?: (tab: Tab) => void;
  // Pass this when the caller already knows it (app/page.tsx tracks it in
  // state); omitted on pages like /account that have no other reason to
  // track it, where it's derived client-side instead.
  hasActiveWorkout?: boolean;
  variant?: "app" | "external";
}

// Shared by "/" and every other route (currently just /account) so
// navigation is never a dead end — the same nav bar, in the same place,
// everywhere in the app.
export default function AppHeader({ activeTab, onTabChange, hasActiveWorkout: hasActiveWorkoutProp, variant = "external" }: AppHeaderProps) {
  const reposState = useRepositories();
  const [derivedHasActiveWorkout, setDerivedHasActiveWorkout] = useState(false);

  // Only needed when the caller didn't already know (e.g. /account, which
  // has no other reason to track active-workout state). Goes through the
  // same repository selection as everywhere else rather than reading
  // Supabase directly — proxy.ts guarantees this only ever renders for a
  // signed-in visitor, so reposState resolves to "ready" or briefly
  // "loading"/"unauthenticated" during the client-side auth check.
  useEffect(() => {
    if (hasActiveWorkoutProp !== undefined) return;
    if (reposState.status !== "ready") return;

    const { repositories, userId } = reposState;
    let cancelled = false;

    repositories.activeWorkout
      .getActiveWorkout(userId)
      .then((workout) => {
        if (!cancelled) setDerivedHasActiveWorkout(workout !== null);
      })
      .catch(() => {
        if (!cancelled) setDerivedHasActiveWorkout(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasActiveWorkoutProp, reposState]);

  const hasActiveWorkout = hasActiveWorkoutProp ?? derivedHasActiveWorkout;

  return (
    <>
      <div className="flex justify-end">
        <AuthStatus />
      </div>

      <header className="text-center">
        <Link href="/" className="inline-block rounded-lg transition hover:opacity-80">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">AI Workout Plan Generator</h1>
        </Link>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Answer a few quick questions and we&apos;ll build you a personalized weekly training plan.
        </p>
      </header>

      <AppNavigation activeTab={activeTab} onTabChange={onTabChange} hasActiveWorkout={hasActiveWorkout} variant={variant} />
    </>
  );
}
