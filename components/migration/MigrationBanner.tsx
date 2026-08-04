"use client";

import { useState } from "react";
import Link from "next/link";
import { useMigrationOffer } from "@/lib/migration/eligibility";

// A lightweight nudge shown app-wide for a signed-in user with eligible
// device data — the actual review/import flow lives on /account
// (MigrationPanel). Dismissing this is purely local UI state for the
// current visit, not a persisted decision — "Decide later" / "Keep this
// account empty" on the review screen itself are the real, remembered
// choices (see lib/migration/status.ts).
export default function MigrationBanner() {
  const { loading, eligible, preview } = useMigrationOffer();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !eligible || dismissed || !preview) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--control-radius)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
      <p>This browser has workout data from before you signed in. Review it and choose whether to import it.</p>
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/account" className="font-semibold text-accent hover:underline">
          Review data
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md px-1.5 py-0.5 text-accent transition hover:bg-accent-soft"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
