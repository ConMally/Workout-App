interface InjuryWarningProps {
  message: string;
}

export default function InjuryWarning({ message }: InjuryWarningProps) {
  return (
    <div className="flex gap-3 rounded-[var(--card-radius)] border border-danger/30 bg-danger-soft p-4 sm:p-5">
      <span
        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4M12 16.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <div>
        <h3 className="text-sm font-semibold text-danger">Please read before starting</h3>
        <p className="mt-1 text-sm leading-relaxed text-danger">{message}</p>
      </div>
    </div>
  );
}
