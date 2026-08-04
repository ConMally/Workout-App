"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateProfile } from "@/app/account/actions";
import { initialActionState } from "@/lib/auth/action-state";
import type { Profile } from "@/lib/repositories/profile-repository";
import Button from "@/components/ui/Button";

const FIELD_CLASS =
  "mt-1 h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30 disabled:bg-surface-muted disabled:text-text-muted";

interface ProfileFormProps {
  profile: Profile;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-label">Profile</h2>
        <p className="mt-1 text-xs text-text-muted">
          Looking for your weight unit? That&apos;s in{" "}
          <Link href="/?tab=settings" className="text-accent hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-text-secondary">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={60}
          defaultValue={profile.displayName ?? ""}
          disabled={pending}
          className={FIELD_CLASS}
        />
        {state.fieldErrors?.displayName && <p className="mt-1 text-xs text-danger">{state.fieldErrors.displayName[0]}</p>}
      </div>

      <div>
        <label htmlFor="experienceLevel" className="block text-sm font-medium text-text-secondary">
          Experience level
        </label>
        <select
          id="experienceLevel"
          name="experienceLevel"
          defaultValue={profile.experienceLevel ?? ""}
          disabled={pending}
          className={FIELD_CLASS}
        >
          <option value="">No preference set</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="weeklyTrainingTarget" className="block text-sm font-medium text-text-secondary">
          Weekly training target
        </label>
        <input
          id="weeklyTrainingTarget"
          name="weeklyTrainingTarget"
          type="number"
          min={1}
          max={7}
          placeholder="Not set"
          defaultValue={profile.weeklyTrainingTarget ?? ""}
          disabled={pending}
          className={`${FIELD_CLASS} w-24`}
        />
        {state.fieldErrors?.weeklyTrainingTarget && (
          <p className="mt-1 text-xs text-danger">{state.fieldErrors.weeklyTrainingTarget[0]}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
        <input
          type="checkbox"
          name="onboardingCompleted"
          defaultChecked={profile.onboardingCompleted}
          disabled={pending}
          className="h-4 w-4 rounded border-border accent-accent"
        />
        Onboarding completed
        <span className="sr-only"> — uncheck to see the Getting Started checklist again on your Dashboard</span>
      </label>

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="rounded-[var(--control-radius)] bg-accent-soft px-3 py-2 text-sm text-accent">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="primary" loading={pending} className="w-fit">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
