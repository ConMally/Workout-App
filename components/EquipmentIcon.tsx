import type { OnboardingInput } from "@/lib/schemas";

type EquipmentType = OnboardingInput["equipment"][number];

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  className: "h-6 w-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

// Small hand-drawn line icons for each equipment category — no external
// icon library dependency, kept intentionally simple/abstract rather than
// literal illustrations.
export default function EquipmentIcon({ type }: { type: EquipmentType }) {
  switch (type) {
    case "bodyweight_only":
      return (
        <svg {...ICON_PROPS}>
          <circle cx="12" cy="5.5" r="2.25" />
          <path d="M12 7.75v5M9 10.5h6M9 20l3-6.75M15 20l-3-6.75" />
        </svg>
      );
    case "dumbbells":
      return (
        <svg {...ICON_PROPS}>
          <line x1="7" y1="12" x2="17" y2="12" />
          <rect x="4.5" y="9" width="3" height="6" rx="1" />
          <rect x="16.5" y="9" width="3" height="6" rx="1" />
          <rect x="2.5" y="10.25" width="2" height="3.5" rx="0.5" />
          <rect x="19.5" y="10.25" width="2" height="3.5" rx="0.5" />
        </svg>
      );
    case "barbell":
      return (
        <svg {...ICON_PROPS}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <rect x="3" y="8.5" width="2.25" height="7" rx="0.5" />
          <rect x="18.75" y="8.5" width="2.25" height="7" rx="0.5" />
          <rect x="1" y="9.75" width="1.5" height="4.5" rx="0.5" />
          <rect x="21.5" y="9.75" width="1.5" height="4.5" rx="0.5" />
        </svg>
      );
    case "resistance_bands":
      return (
        <svg {...ICON_PROPS}>
          <path d="M3 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0" />
        </svg>
      );
    case "kettlebells":
      return (
        <svg {...ICON_PROPS}>
          <path d="M9.25 9a2.75 2.75 0 0 1 5.5 0" />
          <rect x="7" y="10" width="10" height="9" rx="4.5" />
        </svg>
      );
    case "pull_up_bar":
      return (
        <svg {...ICON_PROPS}>
          <line x1="4" y1="6.5" x2="20" y2="6.5" />
          <line x1="6.5" y1="6.5" x2="6.5" y2="18" />
          <line x1="17.5" y1="6.5" x2="17.5" y2="18" />
        </svg>
      );
    case "cardio_machines":
      return (
        <svg {...ICON_PROPS}>
          <circle cx="15.5" cy="5.5" r="1.75" />
          <path d="M13.5 8.5l-2 2.75 2.75 1.75.75 4M11.5 11.25l-3.5 2M14.25 13l2.75.75 1.75 3" />
        </svg>
      );
    case "full_gym":
      return (
        <svg {...ICON_PROPS}>
          <path d="M3 9.5 12 4l9 5.5" />
          <rect x="3" y="9.5" width="18" height="9.5" rx="1.25" />
          <line x1="9" y1="19" x2="9" y2="13" />
          <line x1="15" y1="19" x2="15" y2="13" />
        </svg>
      );
    default:
      return null;
  }
}
