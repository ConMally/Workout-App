import Button from "@/components/ui/Button";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--card-radius)] border border-danger/30 bg-danger-soft px-6 py-8 text-center sm:px-8">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-danger"
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
          <path d="M12 9v4M12 16.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <h2 className="text-lg font-semibold text-danger">{title}</h2>
      <p className="max-w-md text-sm text-text-secondary">{message}</p>
      <Button variant="destructive" onClick={onRetry} className="mt-1">
        {retryLabel}
      </Button>
    </div>
  );
}
