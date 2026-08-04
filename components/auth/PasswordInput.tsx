"use client";

import { useId, useState } from "react";

interface PasswordInputProps {
  name: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  errors?: string[];
  disabled?: boolean;
}

export default function PasswordInput({ name, label, autoComplete, errors, disabled }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = useId();
  const errorMessage = errors?.[0];

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          className="h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 pr-11 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30 disabled:bg-surface-muted disabled:text-text-muted"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[var(--control-radius)] text-text-muted hover:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed"
        >
          {visible ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5-8-5.5-8-5.5Z" />
              <circle cx="10" cy="10" r="2.25" />
              <path d="M3 3l14 14" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5-8-5.5-8-5.5Z" />
              <circle cx="10" cy="10" r="2.25" />
            </svg>
          )}
        </button>
      </div>
      {errorMessage && (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
