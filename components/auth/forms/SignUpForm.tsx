"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import PasswordInput from "@/components/auth/PasswordInput";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialActionState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="rounded-lg bg-teal-50 px-3 py-3 text-sm text-teal-800">{state.message}</p>
        <Link href="/login" className="text-sm font-medium text-teal-700 hover:underline">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-4">
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

        <PasswordInput name="password" label="Password" autoComplete="new-password" errors={state.fieldErrors?.password} disabled={pending} />
        <PasswordInput
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          errors={state.fieldErrors?.confirmPassword}
          disabled={pending}
        />

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
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
