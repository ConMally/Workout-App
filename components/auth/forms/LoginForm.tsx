"use client";

import { useActionState } from "react";
import Link from "next/link";
import { logIn } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import PasswordInput from "@/components/auth/PasswordInput";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Button from "@/components/ui/Button";
import Divider from "@/components/ui/Divider";
import StatusMessage from "@/components/ui/StatusMessage";

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

        <PasswordInput name="password" label="Password" autoComplete="current-password" errors={state.fieldErrors?.password} disabled={pending} />

        <div className="text-right text-sm">
          <Link href="/forgot-password" className="font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        </div>

        {state.status === "error" && state.message && (
          <StatusMessage tone="danger" role="alert">
            {state.message}
          </StatusMessage>
        )}

        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <Divider label="or" />

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
