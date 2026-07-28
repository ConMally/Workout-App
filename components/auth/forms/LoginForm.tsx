"use client";

import { useActionState } from "react";
import Link from "next/link";
import { logIn } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import PasswordInput from "@/components/auth/PasswordInput";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(logIn, initialActionState);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-4">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-50 disabled:text-slate-400"
          />
          {state.fieldErrors?.email && (
            <p id="email-error" className="mt-1 text-xs text-red-600">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>

        <PasswordInput name="password" label="Password" autoComplete="current-password" errors={state.fieldErrors?.password} disabled={pending} />

        <div className="text-right text-sm">
          <Link href="/forgot-password" className="font-medium text-teal-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        {state.status === "error" && state.message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-teal-700 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
