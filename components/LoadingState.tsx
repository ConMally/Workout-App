export default function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"
    >
      <div className="relative h-12 w-12" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-teal-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">Building your personalized plan</p>
        <p className="mt-1 text-sm text-slate-500">This usually takes just a moment...</p>
      </div>
      <div className="mt-2 w-full max-w-sm space-y-2" aria-hidden="true">
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
