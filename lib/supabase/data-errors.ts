// Maps raw Supabase/Postgrest data errors to short, friendly, non-leaking
// messages — the data-layer counterpart to lib/supabase/auth-errors.ts.
// Never let a raw PostgrestError or network exception reach a React error
// boundary or a rendered string; every repository call that can fail is
// expected to be wrapped in try/catch by its caller, passing the caught
// value through this function before showing it to a user.

interface DataErrorLike {
  message?: string;
  code?: string;
}

const PATTERNS: { test: RegExp; message: string }[] = [
  { test: /JWT|token is expired|invalid.*session|not authenticated/i, message: "Your session has expired. Please log in again." },
  { test: /permission denied|row-level security|RLS/i, message: "You don't have permission to view or change this. Try signing in again." },
  { test: /network|fetch failed|failed to fetch|ECONNREFUSED/i, message: "Couldn't reach the server. Check your connection and try again." },
  { test: /timeout/i, message: "That took too long. Please try again." },
  { test: /duplicate key|already exists|unique constraint/i, message: "That already exists — try refreshing and trying again." },
];

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
