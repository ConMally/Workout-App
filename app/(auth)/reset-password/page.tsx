import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/forms/ResetPasswordForm";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reset Password — AI Workout Plan Generator" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  if (!hasSupabaseEnv()) {
    return <SupabaseNotConfigured />;
  }

  const params = await searchParams;

  // A valid recovery session only exists here because /auth/callback
  // already exchanged the emailed code for one. Never show the "set a new
  // password" form without independently re-verifying that server-side —
  // the query param alone is not proof of anything.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (params.error === "invalid_link" || !user) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Link invalid or expired</h1>
        <p className="text-sm text-slate-500">
          This password reset link is no longer valid. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
