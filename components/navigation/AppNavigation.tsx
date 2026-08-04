"use client";

import Link from "next/link";

export type Tab =
  | "dashboard"
  | "plan"
  | "workout"
  | "history"
  | "insights"
  | "templates"
  | "exercises"
  | "settings"
  | "account";

interface AppNavigationProps {
  activeTab: Tab;
  hasActiveWorkout: boolean;
  onTabChange?: (tab: Tab) => void;
  // "app": rendered inside the "/" single-page app — every item except
  // Account is a local tab switch (onTabChange). "external": rendered from
  // a separate route (e.g. /account) — every item is a real link back into
  // "/", since there's no local tab state to switch there.
  variant?: "app" | "external";
}

const BASE_TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "plan", label: "Plan" },
  { id: "history", label: "History" },
  { id: "insights", label: "Insights" },
  { id: "templates", label: "Templates" },
  { id: "exercises", label: "Exercises" },
  { id: "settings", label: "Settings" },
];

const ACTIVE_WORKOUT_TAB: { id: Tab; label: string } = { id: "workout", label: "Active Workout" };
const ACCOUNT_TAB: { id: Tab; label: string } = { id: "account", label: "Account" };

export default function AppNavigation({ activeTab, hasActiveWorkout, onTabChange, variant = "app" }: AppNavigationProps) {
  // Order: Dashboard, Plan, (Active Workout), History, Insights, Templates, Exercises, Settings, Account.
  const baseWithWorkout = hasActiveWorkout
    ? [BASE_TABS[0], BASE_TABS[1], ACTIVE_WORKOUT_TAB, ...BASE_TABS.slice(2)]
    : BASE_TABS;
  const tabs = [...baseWithWorkout, ACCOUNT_TAB];

  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        const className = `min-w-[calc(33%-0.25rem)] flex-1 rounded-[var(--control-radius)] px-2 py-2 text-center text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:min-w-0 sm:px-3 sm:text-sm ${
          selected ? "bg-accent text-accent-foreground shadow-sm" : "text-text-secondary hover:bg-surface-muted"
        }`;

        // Account is always a real route; every other tab becomes a real
        // route too when this nav is rendered outside "/" (variant="external").
        if (tab.id === "account" || variant === "external") {
          const href = tab.id === "account" ? "/account" : `/?tab=${tab.id}`;
          return (
            <Link key={tab.id} href={href} aria-current={selected ? "page" : undefined} className={className}>
              {tab.label}
            </Link>
          );
        }

        return (
          <button key={tab.id} type="button" onClick={() => onTabChange?.(tab.id)} aria-current={selected ? "page" : undefined} className={className}>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
