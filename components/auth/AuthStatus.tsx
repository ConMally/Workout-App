"use client";

import Link from "next/link";
import { logOut } from "@/app/(auth)/actions";
import { useAuthStatus } from "./useAuthStatus";

// Reserves the same footprint in every state so resolving auth status
// never shifts the header layout.
export default function AuthStatus() {
  const { status } = useAuthStatus();

  if (status === "loading") {
    return <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />;
  }

  if (status === "signed-in") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/account"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Account
        </Link>
        <form action={logOut}>
          <button type="submit" className="rounded-lg px-3 py-1.5 font-medium text-slate-500 transition hover:text-red-600">
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
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-teal-700"
      >
        Sign up
      </Link>
    </div>
  );
}
