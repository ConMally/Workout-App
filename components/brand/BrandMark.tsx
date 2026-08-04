interface BrandMarkProps {
  className?: string;
  size?: number;
}

// The LiftWise mark: three ascending bars capped with a small upward
// chevron — reads as "progress going up," not a literal barbell or a
// muscular silhouette, and stays legible at favicon size (the whole thing
// is built from four straight/angled strokes, no fine detail to lose at
// 16px). Deliberately not modeled on any existing fitness brand's mark.
//
// The badge background/foreground both come from the accent design tokens
// (app/globals.css), so this automatically stays correct in light and dark
// mode with no separate dark: variant needed here.
export default function BrandMark({ className = "", size = 28 }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 18v-5" />
        <path d="M11 18V9" />
        <path d="M18 18V6" />
        <path d="M14.5 8.5 18 5l3.5 3.5" />
      </svg>
    </span>
  );
}
