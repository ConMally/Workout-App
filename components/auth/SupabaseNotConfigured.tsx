export default function SupabaseNotConfigured() {
  return (
    <div className="flex flex-col gap-3 text-center">
      <h1 className="text-page-title text-text-primary">Accounts aren&apos;t set up yet</h1>
      <p className="text-supporting">
        LiftWise requires a Supabase project to handle sign-in. To enable it here, add a Supabase project&apos;s
        URL and anon key to{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">.env.local</code>. See{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">docs/AUTHENTICATION.md</code> for setup
        steps.
      </p>
    </div>
  );
}
