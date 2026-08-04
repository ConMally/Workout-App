interface EmptyStateProps {
  title?: string;
  message?: string;
}

export default function EmptyState({
  title = "No plan yet",
  message = "Answer a few quick questions and we'll build your personalized weekly plan.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--card-radius)] border border-dashed border-border bg-surface-muted px-6 py-8 text-center">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 12h12M9 8v8M15 8v8" />
        </svg>
      </span>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="max-w-xs text-sm text-text-muted">{message}</p>
    </div>
  );
}
