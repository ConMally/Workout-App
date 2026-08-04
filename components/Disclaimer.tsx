export default function Disclaimer() {
  return (
    <div className="flex items-start gap-2 rounded-[var(--control-radius)] bg-surface-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
      <svg
        viewBox="0 0 20 20"
        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 9v4.5M10 6.75h.01" strokeLinecap="round" />
      </svg>
      <p>
        <strong className="font-semibold text-text-secondary">Educational use only</strong> — not
        medical advice. Consult a doctor or certified trainer before starting, especially if you
        have an injury, medical condition, or are pregnant.
      </p>
    </div>
  );
}
