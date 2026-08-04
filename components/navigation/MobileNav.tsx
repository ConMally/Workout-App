"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Tab } from "./AppNavigation";
import { TAB_ICONS } from "./tabIcons";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface MobileNavProps {
  activeTab: Tab;
  hasActiveWorkout: boolean;
  onTabChange?: (tab: Tab) => void;
  variant?: "app" | "external";
}

const PRIMARY_LABELS: Record<Tab, string> = {
  dashboard: "Home",
  plan: "Plan",
  workout: "Workout",
  history: "History",
  insights: "Insights",
  templates: "Templates",
  exercises: "Exercises",
  settings: "Settings",
  account: "Account",
};

const MORE_TABS: Tab[] = ["templates", "history", "insights", "settings", "account"];

// PART 9: mobile bottom navigation — no more than 5 primary destinations
// (Home, Plan, Workout only while one is active, Exercises, More), with
// everything else reachable from the More sheet. "Do not hide active
// workout access": the Workout item only ever disappears from the primary
// row when there genuinely isn't one to resume, exactly mirroring
// AppNavigation's own hasActiveWorkout conditional on desktop — never a
// second, different rule.
export default function MobileNav({ activeTab, hasActiveWorkout, onTabChange, variant = "app" }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, moreOpen);

  const primaryTabs: Tab[] = hasActiveWorkout
    ? ["dashboard", "plan", "workout", "exercises"]
    : ["dashboard", "plan", "exercises"];
  const moreIsActive = MORE_TABS.includes(activeTab);

  function go(tab: Tab) {
    setMoreOpen(false);
    onTabChange?.(tab);
  }

  function handleSheetKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") setMoreOpen(false);
  }

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="flex items-stretch justify-around">
          {primaryTabs.map((tab) => (
            <MobileNavItem key={tab} tab={tab} selected={activeTab === tab} variant={variant} onSelect={() => go(tab)} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              moreIsActive ? "text-accent" : "text-text-secondary"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
              <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 sm:hidden"
          role="presentation"
          onClick={() => setMoreOpen(false)}
          onKeyDown={handleSheetKeyDown}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onClick={(e) => e.stopPropagation()}
            className="motion-safe:animate-sheet-up w-full rounded-t-2xl border-t border-border bg-surface-elevated pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-lg"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <ul className="flex flex-col gap-1 p-3">
              {MORE_TABS.map((tab) => (
                <li key={tab}>
                  <MoreSheetItem tab={tab} selected={activeTab === tab} variant={variant} onSelect={() => go(tab)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function MobileNavItem({
  tab,
  selected,
  variant,
  onSelect,
}: {
  tab: Tab;
  selected: boolean;
  variant: "app" | "external";
  onSelect: () => void;
}) {
  const className = `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
    selected ? "text-accent" : "text-text-secondary"
  }`;
  const content = (
    <>
      <span className="h-5 w-5">{TAB_ICONS[tab]}</span>
      {PRIMARY_LABELS[tab]}
    </>
  );

  if (variant === "external") {
    return (
      <Link href={`/?tab=${tab}`} aria-current={selected ? "page" : undefined} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSelect} aria-current={selected ? "page" : undefined} className={className}>
      {content}
    </button>
  );
}

function MoreSheetItem({
  tab,
  selected,
  variant,
  onSelect,
}: {
  tab: Tab;
  selected: boolean;
  variant: "app" | "external";
  onSelect: () => void;
}) {
  const className = `flex w-full items-center gap-3 rounded-[var(--control-radius)] px-3 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
    selected ? "bg-accent-soft text-accent" : "text-text-primary hover:bg-surface-muted"
  }`;
  const content = (
    <>
      <span className="h-5 w-5 flex-shrink-0">{TAB_ICONS[tab]}</span>
      {PRIMARY_LABELS[tab]}
    </>
  );

  if (tab === "account" || variant === "external") {
    const href = tab === "account" ? "/account" : `/?tab=${tab}`;
    return (
      <Link href={href} aria-current={selected ? "page" : undefined} className={className} onClick={onSelect}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSelect} aria-current={selected ? "page" : undefined} className={className}>
      {content}
    </button>
  );
}
