import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the "middleware" file convention to "proxy" (same
// mechanism, new name/export — see https://nextjs.org/docs/messages/middleware-to-proxy).
//
// Three jobs: keep the Supabase auth session cookie fresh (see
// lib/supabase/middleware.ts); require a signed-in session for every route
// except the public auth ones below (this app has no guest/local-only mode
// — every page holds user data); and send an already-signed-in visitor away
// from the auth-entry pages instead of showing them a login/signup form
// they no longer need. With no Supabase project configured, `user` is
// always null, so every route falls through to the sign-in redirect and
// each public auth page renders its own "not configured" state instead of
// a real form (see hasSupabaseEnv() checks in those pages) — nothing is
// usable without Supabase configured, which is the intended failure mode
// now that there's no local-only fallback.
const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];
// Signed-in visitors have no reason to be here — bounce them to the app
// instead of showing a login/signup form for an account they're already in.
const AUTH_ENTRY_PATH_PREFIXES = ["/login", "/signup"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (user && matchesPrefix(pathname, AUTH_ENTRY_PATH_PREFIXES)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!user && !matchesPrefix(pathname, PUBLIC_PATH_PREFIXES)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized", message: "Sign in required." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next's own internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
