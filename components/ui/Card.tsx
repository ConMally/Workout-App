import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padded?: boolean;
  children?: ReactNode;
}

// The shared surface/card shell — border-border, card-radius, and the
// surface vs. surface-elevated token pair (PART 3) replace the
// hand-typed "rounded-2xl border border-slate-200 bg-white shadow-sm
// dark:border-slate-800 dark:bg-slate-900" string repeated across the app.
export default function Card({ elevated = false, padded = true, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[var(--card-radius)] border border-border ${
        elevated ? "bg-surface-elevated shadow-md" : "bg-surface shadow-sm"
      } ${padded ? "p-[var(--card-padding)]" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
