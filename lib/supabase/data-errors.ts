// Maps raw Supabase/Postgrest data errors to short, friendly, non-leaking
// messages — the data-layer counterpart to lib/supabase/auth-errors.ts.
// Never let a raw PostgrestError or network exception reach a React error
// boundary or a rendered string; every repository call that can fail is
// expected to be wrapped in try/catch by its caller, passing the caught
// value through this function before showing it to a user.

interface DataErrorLike {
  message?: string;
  code?: string;
  // Postgrest's own PostgrestError class carries these too (see
  // node_modules/@supabase/postgrest-js/src/PostgrestError.ts) — `hint` in
  // particular is often the single most actionable field (e.g. the exact
  // fix for an ambiguous-embed or RLS error), but neither is on the base
  // DataErrorLike shape used elsewhere in this file, so logSupabaseError
  // below reads them separately.
  details?: string;
  hint?: string;
}

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";

const PATTERNS: { test: RegExp; message: string }[] = [
  { test: /JWT|token is expired|invalid.*session|not authenticated/i, message: SESSION_EXPIRED_MESSAGE },
  { test: /permission denied|row-level security|RLS/i, message: "You don't have permission to view or change this. Try signing in again." },
  { test: /network|fetch failed|failed to fetch|ECONNREFUSED/i, message: "Couldn't reach the server. Check your connection and try again." },
  { test: /timeout/i, message: "That took too long. Please try again." },
  { test: /duplicate key|already exists|unique constraint/i, message: "That already exists — try refreshing and trying again." },
];

// Lets callers show an obvious "Log in again" action next to the friendly
// message rather than just displaying text and stranding the user (PART 7:
// "never trap the user") — matched against the exact string
// getFriendlyDataErrorMessage returns for this case, kept in this file so
// the two never drift apart.
export function isSessionExpiredMessage(message: string): boolean {
  return message === SESSION_EXPIRED_MESSAGE;
}

// Postgres's unique_violation SQLSTATE. Used to distinguish "this exact
// row was already written" (safe to treat as success on a retry of an
// idempotent operation) from a genuine failure — see
// app/page.tsx#finalizeWorkout's personal-records retry handling.
export function isUniqueViolation(error: unknown): boolean {
  return isDataErrorLike(error) && error.code === "23505";
}

export function getFriendlyDataErrorMessage(error: unknown): string {
  const details = isDataErrorLike(error) ? error : null;

  if (details?.message) {
    for (const pattern of PATTERNS) {
      if (pattern.test.test(details.message)) return pattern.message;
    }
  }

  // Postgrest's RLS-denial code and a couple of other common codes worth
  // recognizing even if the message wording varies.
  if (details?.code === "PGRST301" || details?.code === "42501") {
    return "You don't have permission to view or change this. Try signing in again.";
  }

  return "Something went wrong loading your data. Please try again.";
}

function isDataErrorLike(error: unknown): error is DataErrorLike {
  return typeof error === "object" && error !== null && ("message" in error || "code" in error);
}

// Dev-only structured logging for a raw Supabase/Postgrest error — every
// data-loading/mutation call site that catches one should log through this
// instead of `console.error(prefix, error)` directly. A PostgrestError
// extends Error, and `message` is a non-enumerable own property on any
// Error instance (per the ECMAScript spec) while `code`/`details`/`hint`
// are plain enumerable instance fields Postgrest adds — passing the raw
// object straight to console.error/JSON.stringify is exactly what produces
// the "only `{}`" symptom in some tooling/log pipelines (Next.js's
// server-console formatting, log aggregators, anything that JSON-serializes
// without calling toJSON, etc.), because they don't reliably surface a
// non-enumerable field the same way an interactive browser console's object
// inspector does. Destructuring all four fields explicitly here sidesteps
// that entirely — the fields always end up as plain enumerable properties
// of the object actually passed to console.error, regardless of what error
// shape or logging environment is on the other end. No-ops outside
// development so nothing here ever reaches a production log.
export function logSupabaseError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "production") return;

  const details = isDataErrorLike(error) ? error : null;
  console.error(`[supabase] ${context} failed:`, {
    code: details?.code ?? null,
    message: details?.message ?? (error instanceof Error ? error.message : String(error)),
    details: details?.details ?? null,
    hint: details?.hint ?? null,
  });
}
