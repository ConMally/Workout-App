import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the "middleware" file convention to "proxy" (same
// mechanism, new name/export — see https://nextjs.org/docs/messages/middleware-to-proxy).
//
// Two jobs: keep the Supabase auth session cookie fresh (see
// lib/supabase/middleware.ts), and redirect signed-out visitors away from
// account-only routes. Everything else — the whole existing app, plan
// generation, onboarding — stays fully public. Safe to run with no
// Supabase project configured; route protection simply never triggers in
// that case (there's no such thing as "signed in" yet).
const PROTECTED_PATH_PREFIXES = ["/account"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
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
