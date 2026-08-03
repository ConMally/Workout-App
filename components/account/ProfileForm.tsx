"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateProfile } from "@/app/account/actions";
import { initialActionState } from "@/lib/auth/action-state";
import type { Profile } from "@/lib/repositories/profile-repository";

interface ProfileFormProps {
  profile: Profile;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Profile</h2>
        <p className="mt-1 text-xs text-slate-400">
          Looking for your weight unit? That&apos;s in{" "}
          <Link href="/?tab=settings" className="text-teal-700 hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={60}
          defaultValue={profile.displayName ?? ""}
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-50 disabled:text-slate-400"
        />
        {state.fieldErrors?.displayName && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.displayName[0]}</p>}
      </div>

      <div>
        <label htmlFor="experienceLevel" className="block text-sm font-medium text-slate-700">
          Experience level
        </label>
        <select
          id="experienceLevel"
          name="experienceLevel"
          defaultValue={profile.experienceLevel ?? ""}
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-50"
        >
          <option value="">No preference set</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="weeklyTrainingTarget" className="block text-sm font-medium text-slate-700">
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
          className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-50"
        />
        {state.fieldErrors?.weeklyTrainingTarget && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.weeklyTrainingTarget[0]}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="onboardingCompleted"
          defaultChecked={profile.onboardingCompleted}
          disabled={pending}
          className="h-4 w-4 rounded border-slate-300 accent-teal-600"
        />
        Onboarding completed
        <span className="sr-only"> — uncheck to see the Getting Started checklist again on your Dashboard</span>
      </label>

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
