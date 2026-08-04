"use client";

import Link from "next/link";
import { logOut } from "@/app/(auth)/actions";
import { useAuthStatus } from "./useAuthStatus";

// Reserves the same footprint in every state so resolving auth status
// never shifts the header layout.
export default function AuthStatus() {
  const { status } = useAuthStatus();

  if (status === "loading") {
    return <div className="h-9 w-40 animate-pulse rounded-lg bg-surface-muted" aria-hidden="true" />;
  }

  if (status === "signed-in") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/account"
          className="rounded-[var(--control-radius)] border border-border bg-surface px-3 py-1.5 font-medium text-text-primary shadow-sm transition hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Account
        </Link>
        <form action={logOut}>
          <button
            type="submit"
            className="rounded-[var(--control-radius)] px-3 py-1.5 font-medium text-text-secondary transition hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/login"
        className="rounded-[var(--control-radius)] border border-border bg-surface px-3 py-1.5 font-medium text-text-primary shadow-sm transition hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-[var(--control-radius)] bg-accent px-3 py-1.5 font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        Sign up
      </Link>
    </div>
  );
}
