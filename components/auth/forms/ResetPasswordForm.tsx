"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import PasswordInput from "@/components/auth/PasswordInput";

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PasswordInput name="password" label="New password" autoComplete="new-password" errors={state.fieldErrors?.password} disabled={pending} />
      <PasswordInput
        name="confirmPassword"
        label="Confirm new password"
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
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
