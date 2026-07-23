import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

// For use inside Server Components, Route Handlers, and Server Actions
// only. Not called anywhere in the app yet. Creates a new client per
// request (Fluid-compute / edge safe) rather than a shared singleton.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // set. Safe to ignore as long as middleware.ts is refreshing the
          // session on every request (it is — see lib/supabase/middleware.ts).
        }
      },
    },
  });
}
