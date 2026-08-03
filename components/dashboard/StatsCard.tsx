interface StatsCardProps {
  icon: string;
  label: string;
  value: string;
}

export default function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-lg dark:bg-teal-950/50"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase leading-tight tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}
