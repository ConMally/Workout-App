// Maps raw Supabase auth errors to short, friendly, non-leaking messages.
// Never surface error.message from Supabase directly to the UI — it can
// change wording between versions and occasionally repeats internal
// details a user doesn't need (or that could help an attacker enumerate
// accounts).

interface AuthErrorLike {
  message?: string;
  status?: number;
}

const PATTERNS: { test: RegExp; message: string }[] = [
  { test: /invalid login credentials/i, message: "That email or password doesn't look right. Please try again." },
  { test: /email not confirmed/i, message: "Please confirm your email address before logging in — check your inbox for the confirmation link." },
  { test: /user already registered|already been registered/i, message: "An account with that email already exists. Try logging in instead." },
  { test: /password should be at least|password.*too short/i, message: "Password must be at least 8 characters." },
  { test: /new password should be different/i, message: "Your new password must be different from your current password." },
  { test: /rate limit|too many requests/i, message: "Too many attempts. Please wait a moment and try again." },
  { test: /token has expired or is invalid|invalid.*(code|token)|otp.*expired/i, message: "This link is invalid or has expired. Please request a new one." },
  { test: /email.*invalid/i, message: "Enter a valid email address." },
  { test: /network|fetch failed|failed to fetch/i, message: "Couldn't reach the server. Check your connection and try again." },
];

export function getFriendlyAuthErrorMessage(error: unknown): string {
  const message = isAuthErrorLike(error) ? error.message : undefined;

  if (message) {
    for (const pattern of PATTERNS) {
      if (pattern.test.test(message)) return pattern.message;
    }
  }

  return "Something went wrong. Please try again.";
}

function isAuthErrorLike(error: unknown): error is AuthErrorLike {
  return typeof error === "object" && error !== null && "message" in error;
}
