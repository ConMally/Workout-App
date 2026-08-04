import type { Tab } from "./AppNavigation";

// One shared icon per tab — used by both AppNavigation (desktop) and
// MobileNav (mobile bottom bar + More sheet) so "consistent icons" (PART 9)
// is true by construction, not by copy-pasting the same SVG twice. Plain
// inline SVG, no icon library dependency, matching this app's existing
// convention (see e.g. components/EmptyState.tsx).
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export const TAB_ICONS: Record<Tab, React.ReactNode> = {
  dashboard: (
    <svg {...iconProps}>
      <path d="M4 12 12 4l8 8" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  plan: (
    <svg {...iconProps}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  ),
  workout: (
    <svg {...iconProps}>
      <path d="M6 7v10M18 7v10" />
      <path d="M4 9v6M20 9v6" />
      <path d="M6 12h12" />
    </svg>
  ),
  history: (
    <svg {...iconProps}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2h6" />
    </svg>
  ),
  insights: (
    <svg {...iconProps}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  ),
  templates: (
    <svg {...iconProps}>
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
    </svg>
  ),
  exercises: (
    <svg {...iconProps}>
      <path d="M4 17v-2M2 14v2M20 17v-2M22 14v2" />
      <path d="M6 9v6M18 9v6" />
      <path d="M6 12h12" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  account: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
    </svg>
  ),
};
