"use client";

import { useEffect, useState } from "react";

// PART 8: "Support ... offline state." Purely a visibility signal — it
// never blocks logging, and every mutation stays visible in the UI
// immediately (local state updates optimistically before any network call
// — see app/page.tsx#runMutation). There's no offline write queue yet, so
// this is honest about the one real risk: a save attempted while offline
// will fail silently-ish (surfaced via the existing saveError banner) until
// the connection returns — the copy below reflects that rather than
// promising automatic background sync that doesn't exist.
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="motion-safe:animate-step-in flex items-center gap-2 rounded-[var(--control-radius)] border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      <span aria-hidden="true">📶</span>
      You&apos;re offline. Keep logging as normal, but avoid refreshing — changes won&apos;t save to your account until
      your connection comes back.
    </div>
  );
}
