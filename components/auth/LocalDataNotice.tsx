"use client";

import { useAuthStatus } from "./useAuthStatus";

// Only meaningful while signed out — once signed in, the Account page
// carries the equivalent note. Renders nothing while status is still
// resolving or once signed in, so it never flashes.
export default function LocalDataNotice() {
  const { status } = useAuthStatus();

  if (status !== "signed-out") return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      Your plan, workouts, and progress are saved only in this browser right now. Signing in switches
      you to an account that syncs across devices — but it starts fresh: the data already saved on this
      device isn&apos;t moved into your account automatically yet.
    </div>
  );
}
