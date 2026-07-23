export default function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"
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
      <p className="text-sm font-medium text-slate-600">No plan yet</p>
      <p className="max-w-xs text-sm text-slate-400">
        Answer a few quick questions and we&apos;ll build your personalized weekly plan.
      </p>
    </div>
  );
}
