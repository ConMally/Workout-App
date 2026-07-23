"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFriendlyAuthErrorMessage } from "@/lib/supabase/auth-errors";
import { ForgotPasswordSchema, LoginSchema, ResetPasswordSchema, SignUpSchema } from "@/lib/validation/auth";
import type { ActionResult } from "@/lib/auth/action-state";

// Every action here re-derives identity from the server-side Supabase
// client's cookie-backed session (never from anything the client claims),
// and never logs a password, token, or session object. Field-level and
// top-level errors are always pre-mapped to friendly copy — nothing from
// Supabase's raw error.message ever reaches the client directly.
//
// ActionResult / initialActionState live in lib/auth/action-state.ts, not
// here — a "use server" file may only export async functions.

async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

// Only ever redirect to a relative, same-app path — never let a
// client-supplied `redirectTo` send someone off-site.
function safeRedirectPath(path: FormDataEntryValue | null): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/account";
  }
  return path;
}

export async function signUp(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/account` },
  });

  if (error) {
    return { status: "error", message: getFriendlyAuthErrorMessage(error) };
  }

  if (data.session) {
    // Email confirmation is off on this project — the user is already
    // signed in.
    redirect("/account");
  }

  return { status: "success", message: "Check your email to confirm your account, then log in." };
}

export async function logIn(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: getFriendlyAuthErrorMessage(error) };
  }

  redirect(safeRedirectPath(formData.get("redirectTo")));
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Never reveal whether an account exists for this email — always show
  // the same neutral message, except for a genuine rate-limit response,
  // which is safe (and useful) to surface distinctly.
  if (error && /rate limit|too many/i.test(error.message)) {
    return { status: "error", message: getFriendlyAuthErrorMessage(error) };
  }

  return { status: "success", message: "If an account exists for that email, we've sent a password reset link." };
}

export async function resetPassword(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "This link is invalid or has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: getFriendlyAuthErrorMessage(error) };
  }

  redirect("/account");
}

// Google OAuth — the Supabase provider and redirect URLs must be
// configured manually in the dashboard; see docs/AUTHENTICATION.md.
export async function signInWithGoogle(): Promise<void> {
  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/account` },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_unavailable");
  }

  redirect(data.url);
}
