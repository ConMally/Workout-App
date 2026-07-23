"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialActionState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="rounded-lg bg-teal-50 px-3 py-3 text-sm text-teal-800">{state.message}</p>
        <Link href="/login" className="text-sm font-medium text-teal-700 hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
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
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
