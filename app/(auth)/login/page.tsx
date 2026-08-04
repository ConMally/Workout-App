import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/forms/LoginForm";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import StatusMessage from "@/components/ui/StatusMessage";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log In — LiftWise" };

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseEnv()) {
    return <SupabaseNotConfigured />;
  }

  // proxy.ts already redirects a signed-in visitor away from /login — this
  // is the defense-in-depth re-check every protected/auth-entry route in
  // this app makes, never trusting middleware alone.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title text-text-primary">Welcome back to LiftWise</h1>
        <p className="mt-1 text-supporting">Log in to keep training smarter.</p>
      </div>

      {params.error === "invalid_link" && <StatusMessage tone="warning">That link was invalid or has expired.</StatusMessage>}
      {params.error === "oauth_unavailable" && (
        <StatusMessage tone="warning">Google sign-in isn&apos;t available right now. Try email and password instead.</StatusMessage>
      )}

      <LoginForm redirectTo={params.redirectTo} />
    </div>
  );
}
