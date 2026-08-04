"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import PasswordInput from "@/components/auth/PasswordInput";
import Button from "@/components/ui/Button";
import StatusMessage from "@/components/ui/StatusMessage";

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
        <StatusMessage tone="danger" role="alert">
          {state.message}
        </StatusMessage>
      )}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
