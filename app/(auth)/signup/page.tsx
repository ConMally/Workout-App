import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignUpForm from "@/components/auth/forms/SignUpForm";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign Up — LiftWise" };

interface SignUpPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  if (!hasSupabaseEnv()) {
    return <SupabaseNotConfigured />;
  }

  // proxy.ts already redirects a signed-in visitor away from /signup — this
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
        <h1 className="text-page-title text-text-primary">Start training smarter</h1>
        <p className="mt-1 text-supporting">
          Personalized workouts, intelligent progression, and everything you need to train consistently — your
          plan, history, and progress sync securely and stay private to you.
        </p>
      </div>

      <SignUpForm redirectTo={params.redirectTo} />
    </div>
  );
}
