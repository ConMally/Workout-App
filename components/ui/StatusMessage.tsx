import type { ReactNode } from "react";

type StatusTone = "success" | "warning" | "danger" | "info";

interface StatusMessageProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
  // "alert" for errors that should interrupt a screen reader immediately
  // (matches the existing role="alert" on form error text); "status" for
  // calmer, non-urgent confirmations.
  role?: "alert" | "status";
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-accent-soft text-accent",
};

// Inline status/banner message — the "rounded-lg bg-red-50 px-3 py-2
// text-sm text-red-700" pattern repeated across every auth form and
// several other screens, now token-driven and dark-mode-correct in one
// place.
export default function StatusMessage({ tone = "info", children, className = "", role = "status" }: StatusMessageProps) {
  return (
    <p role={role} className={`rounded-lg px-3 py-2 text-sm font-medium ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </p>
  );
}
