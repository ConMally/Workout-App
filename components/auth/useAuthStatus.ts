"use client";

import { useEffect, useState } from "react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

export interface AuthStatusValue {
  status: "loading" | "signed-out" | "signed-in";
  email: string | null;
  userId: string | null;
}

// Shared by AuthStatus (nav widget) and LocalDataNotice so both agree on
// auth state from a single subscription rather than each creating their
// own browser client. Client-side only — reads the session Supabase
// already manages via cookies, never calls a server action just to check
// status.
export function useAuthStatus(): AuthStatusValue {
  // Computed lazily during render (not in the effect below) — hasSupabaseEnv()
  // reads NEXT_PUBLIC_* vars, which are inlined at build time and identical
  // on server and client, so there's no hydration-mismatch risk here.
  const [value, setValue] = useState<AuthStatusValue>(() =>
    hasSupabaseEnv()
      ? { status: "loading", email: null, userId: null }
      : { status: "signed-out", email: null, userId: null }
  );

  useEffect(() => {
    if (!hasSupabaseEnv()) return;

    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setValue({
        status: data.session ? "signed-in" : "signed-out",
        email: data.session?.user.email ?? null,
        userId: data.session?.user.id ?? null,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setValue({
        status: session ? "signed-in" : "signed-out",
        email: session?.user.email ?? null,
        userId: session?.user.id ?? null,
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return value;
}
