import type { Metadata } from "next";
import LoginForm from "@/components/auth/forms/LoginForm";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Log In — AI Workout Plan Generator" };

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseEnv()) {
    return <SupabaseNotConfigured />;
  }

  const params = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back. Your local data stays on this device either way.</p>
      </div>

      {params.error === "invalid_link" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">That link was invalid or has expired.</p>
      )}
      {params.error === "oauth_unavailable" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Google sign-in isn&apos;t available right now. Try email and password instead.
        </p>
      )}

      <LoginForm redirectTo={params.redirectTo} />
    </div>
  );
}
