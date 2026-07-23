import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/forms/ForgotPasswordForm";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Forgot Password — AI Workout Plan Generator" };

export default function ForgotPasswordPage() {
  if (!hasSupabaseEnv()) {
    return <SupabaseNotConfigured />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
