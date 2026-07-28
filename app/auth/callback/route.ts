import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Single callback for every Supabase auth redirect: email confirmation
// after sign-up, password recovery, and Google OAuth. All three arrive
// here as a PKCE `code` param; exchanging it establishes the session, then
// `next` decides where the user lands. Never logs the code or any
// resulting token.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing/invalid/expired code. Send recovery links back to the reset
  // page (which shows its own "request a new link" state); everything
  // else falls back to login. Never surface the raw Supabase error here.
  const errorTarget = next.startsWith("/reset-password") ? "/reset-password" : "/login";
  return NextResponse.redirect(`${origin}${errorTarget}?error=invalid_link`);
}
