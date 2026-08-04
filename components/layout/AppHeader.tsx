"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppNavigation, { type Tab } from "@/components/navigation/AppNavigation";
import MobileNav from "@/components/navigation/MobileNav";
import AuthStatus from "@/components/auth/AuthStatus";
import BrandMark from "@/components/brand/BrandMark";
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

      <header className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg transition hover:opacity-80">
          <BrandMark size={34} />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">LiftWise</h1>
        </Link>
        <p className="max-w-sm text-sm text-text-secondary sm:text-base">Train smarter. Progress with purpose.</p>
      </header>

      {/* Desktop: the full labeled nav row. Mobile: MobileNav's fixed bottom
          bar takes over navigation entirely (PART 9) — see its own
          sm:hidden / this wrapper's hidden sm:block split. */}
      <div className="hidden sm:block">
        <AppNavigation activeTab={activeTab} onTabChange={onTabChange} hasActiveWorkout={hasActiveWorkout} variant={variant} />
      </div>
      <MobileNav activeTab={activeTab} onTabChange={onTabChange} hasActiveWorkout={hasActiveWorkout} variant={variant} />
    </>
  );
}
