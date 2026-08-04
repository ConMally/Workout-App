"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Required (not optional) — an icon-only button with no accessible name
  // is a dead end for screen reader/keyboard users, so this component
  // makes that impossible to skip rather than relying on every call site
  // remembering an aria-label.
  label: string;
  active?: boolean;
  children?: ReactNode;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, className = "", children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--control-radius)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-accent-soft text-accent" : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
