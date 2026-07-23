// Shared env-var access for every Supabase helper. Nothing in this app
// calls these helpers yet (no login page, no server actions using them) —
// they exist so future auth/cloud-storage work has a single, safe place to
// read configuration from. Throwing only when actually invoked (never at
// module load time) means the rest of the app keeps working with zero
// Supabase setup.

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase project's values " +
        "(see docs/SUPABASE.md) — this app still works fully on localStorage without them."
    );
  }

  return { url, anonKey };
}

export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
