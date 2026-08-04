import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseProfileRepository } from "@/lib/repositories/supabase/profile-repository";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { logOut } from "@/app/(auth)/actions";
import SupabaseNotConfigured from "@/components/auth/SupabaseNotConfigured";
import ProfileForm from "@/components/account/ProfileForm";
import AppHeader from "@/components/layout/AppHeader";
import MigrationPanel from "@/components/migration/MigrationPanel";
import SyncStatus from "@/components/account/SyncStatus";
import { formatDate } from "@/lib/workout-log";
import Button from "@/components/ui/Button";

export const metadata: Metadata = { title: "Account — LiftWise" };

export default async function AccountPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-12">
        <SupabaseNotConfigured />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already redirects signed-out visitors away from /account —
  // this is the defense-in-depth re-check that never trusts middleware
  // alone. Not an "immediately after login" redirect: this only fires when
  // there's genuinely no session.
  if (!user) {
    redirect("/login?redirectTo=/account");
  }

  const repository = createSupabaseProfileRepository(supabase);
  let profile = await repository.getProfile(user.id);
  if (!profile) {
    // The handle_new_user() trigger should always have created this row on
    // sign-up — never assume, self-heal if it's somehow missing.
    profile = await repository.upsertProfile(user.id, {});
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[var(--page-max-width)] flex-col gap-6 px-4 pt-8 pb-24 sm:gap-8 sm:px-6 sm:pt-12 sm:pb-12">
      <AppHeader activeTab="account" variant="external" />

      <Link
        href="/?tab=dashboard"
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15l-5-5 5-5" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-page-title text-text-primary">Account</h2>
          <p className="mt-1 text-supporting">{user.email}</p>
        </div>
        <form action={logOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>

      <SyncStatus />

      <MigrationPanel />

      <ProfileForm profile={profile} />

      <p className="text-xs text-text-muted">
        Account created {formatDate(profile.createdAt)} · Last updated {formatDate(profile.updatedAt)}
      </p>
    </main>
  );
}
