export default function SupabaseNotConfigured() {
  return (
    <div className="flex flex-col gap-3 text-center">
      <h1 className="text-xl font-bold text-slate-900">Accounts aren&apos;t set up yet</h1>
      <p className="text-sm text-slate-500">
        This app still works fully without an account — everything is saved on this device. To
        enable sign-in, add a Supabase project&apos;s URL and anon key to{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code>. See{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">docs/AUTHENTICATION.md</code> for
        setup steps.
      </p>
    </div>
  );
}
