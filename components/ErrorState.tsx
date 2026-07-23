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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center sm:px-8">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600"
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
      <h2 className="text-lg font-semibold text-red-900">{title}</h2>
      <p className="max-w-md text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-1 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
      >
        {retryLabel}
      </button>
    </div>
  );
}
