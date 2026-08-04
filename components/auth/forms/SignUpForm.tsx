"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import PasswordInput from "@/components/auth/PasswordInput";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Button from "@/components/ui/Button";
import Divider from "@/components/ui/Divider";
import StatusMessage from "@/components/ui/StatusMessage";

interface SignUpFormProps {
  redirectTo?: string;
}

export default function SignUpForm({ redirectTo }: SignUpFormProps) {
  const [state, formAction, pending] = useActionState(signUp, initialActionState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <StatusMessage tone="success">{state.message}</StatusMessage>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-4">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary">
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
            className="mt-1 h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30 disabled:bg-surface-muted disabled:text-text-muted"
          />
          {state.fieldErrors?.email && (
            <p id="email-error" className="mt-1 text-xs text-danger">
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
          <StatusMessage tone="danger" role="alert">
            {state.message}
          </StatusMessage>
        )}

        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Divider label="or" />

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
