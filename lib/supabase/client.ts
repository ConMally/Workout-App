"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

// For use inside Client Components only. Not called anywhere in the app
// yet — this is foundation for future auth/cloud-storage work. Do not call
// Supabase directly from visual components; go through a repository
// implementation once one exists (see lib/repositories/).
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
