import type { Metadata } from "next";
import SignUpForm from "@/components/auth/forms/SignUpForm";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign Up — AI Workout Plan Generator" };

export default function SignUpPage() {
  if (!hasSupabaseEnv()) {
    return <SupabaseNotConfigured />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create an account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Optional — you can keep using this app fully without one. Your account starts fresh: the plan,
          workouts, and history already saved on this device stay here and aren&apos;t moved in automatically.
        </p>
      </div>

      <SignUpForm />
    </div>
  );
}
