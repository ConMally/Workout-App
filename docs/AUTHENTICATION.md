# Authentication & profile management

Accounts are now fully functional (sign-up, login, logout, password reset,
Google OAuth, profile editing) but **entirely optional**. Nothing about the
core app changed: onboarding, plan generation, logging, history, insights,
and goals all still run on `localStorage` for every visitor, signed in or
not. No workout data has moved to the cloud — only the account/profile
itself lives in Supabase. See `docs/SUPABASE.md` for the underlying
project setup; this document covers the auth flows built on top of it.

## Routes added

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Email/password login + Google OAuth |
| `/signup` | Public | Email/password sign-up + Google OAuth |
| `/forgot-password` | Public | Request a password-reset email |
| `/reset-password` | Public, but requires a valid recovery session | Set a new password |
| `/auth/callback` | Public (technical redirect target) | Exchanges Supabase's PKCE `code` for a session — used by email confirmation, password recovery, and OAuth alike |
| `/account` | **Protected** | View/edit profile, sign out |

Everything else — `/`, onboarding, plan generation, `/api/generate` — is
unchanged and public, exactly as before.

## How route protection works

`proxy.ts` (Next.js 16's renamed `middleware.ts` convention) calls
`lib/supabase/middleware.ts#updateSession` on every request, which refreshes
the session cookie and resolves the current user. If the request path is
`/account` (or under it) and there's no user, `proxy.ts` redirects to
`/login?redirectTo=/account`. `/account`'s Server Component **independently
re-checks** `supabase.auth.getUser()` itself and redirects again if
somehow reached without a session — never trust the middleware layer alone.
If Supabase isn't configured at all, every auth page renders a friendly
"accounts aren't set up yet" message instead of crashing or looping.

## Session lifecycle

- **Sign-up**: creates the `auth.users` row, which fires the existing
  `handle_new_user()` trigger (from `0001_init.sql`) to create a matching
  `profiles` row immediately — before email confirmation, if your project
  requires it (the default). If confirmation is required, the user sees a
  "check your email" message instead of being signed in right away.
- **Refresh**: happens transparently on every request via the middleware
  above; nothing in the UI needs to poll or manually refresh a token.
- **Expiration**: once the refresh token itself is no longer valid,
  `getUser()` resolves to no user — indistinguishable from "never logged
  in" to the rest of the app. Protected routes redirect to `/login`;
  server actions return a friendly "Your session has expired. Please log
  in again." instead of a raw error.
- **Password recovery / expired links**: `/auth/callback` tries to exchange
  the emailed `code` for a session. If that fails (expired, already used,
  tampered), it redirects to `/reset-password?error=invalid_link`, which
  shows a "request a new link" state instead of a broken form.

## Profile fields

| Field | Column | Notes |
|---|---|---|
| Display name | `display_name` | Max 60 characters |
| Preferred weight unit | `preferred_weight_unit` | `lbs` \| `kg` — reuses the app's existing `WeightUnitEnum` |
| Experience level | `experience_level` | `beginner` \| `intermediate` \| `advanced` \| unset — reuses the app's existing `ExperienceLevelEnum` |
| Weekly training target | `weekly_training_target` | 1–7, optional |
| Onboarding completion state | `onboarding_completed` | boolean |
| Created / updated | `created_at` / `updated_at` | Set automatically |

All validated with Zod (`lib/validation/profile.ts`) both on the client
(via the same schema informing field limits) and again server-side in
`app/account/actions.ts#updateProfile` before anything reaches the
database — the server-side check is the one that actually matters, since a
request could always bypass the client.

## Repository layer

Profile reads/writes go through `ProfileRepository`
(`lib/repositories/profile-repository.ts`) and its first concrete
implementation, `createSupabaseProfileRepository`
(`lib/repositories/supabase/profile-repository.ts`) — no page or component
calls `supabase.from("profiles")` directly. Every other repository
interface from the previous phase (`PlanRepository`, `HistoryRepository`,
etc.) remains interface-only; workout data is untouched by this phase.

## Security notes

- Every server action re-derives the user from `supabase.auth.getUser()`
  on the server-side client — a request can't claim to be a different
  user by passing an id.
- `redirectTo` (used after login) is restricted to same-app relative paths
  only (`safeRedirectPath` in `app/(auth)/actions.ts`), preventing an
  open-redirect via a crafted link.
- Forgot-password always returns the same neutral message regardless of
  whether the email is registered, so the flow can't be used to enumerate
  accounts. A genuine rate-limit response is the one exception surfaced
  distinctly (it isn't an account-existence leak).
- Every Supabase error is passed through `lib/supabase/auth-errors.ts`
  before reaching the UI — raw `error.message` strings are never rendered.
- Nothing logs a password, access token, or session object; server actions
  only ever log nothing at all on the success/failure paths that touch
  credentials.
- No service-role key exists anywhere in this app — every server-side
  Supabase call uses the same `anon` key as the browser, with Postgres RLS
  (from `0001_init.sql`) as the actual authorization boundary.

## Supabase settings you must configure

1. **Site URL and Redirect URLs** (Authentication → URL Configuration):
   add `http://localhost:3000/auth/callback` for local development, and
   your production origin's `/auth/callback` once deployed. Email
   confirmation, password recovery, and OAuth all fail without this.
2. **Email templates** (Authentication → Email Templates) — the defaults
   work, but you may want to adjust the confirmation/recovery email
   copy/branding.
3. **Run `0002_profile_fields.sql`** (via the SQL Editor or `supabase db
   push`) if you already ran `0001_init.sql` in a previous session — it's
   a separate, additive migration.

## Google OAuth — manual setup required

Code-wise, `signInWithGoogle` (in `app/(auth)/actions.ts`) and the
"Continue with Google" button are already wired up and gracefully degrade
(redirects to `/login?error=oauth_unavailable` with a friendly message) if
the provider isn't enabled. To actually make it work:

1. **Google Cloud Console**: create an OAuth 2.0 Client ID (Web
   application). Add this **exact** Authorized redirect URI — Google's,
   not your app's:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
2. **Supabase Dashboard** → Authentication → Providers → Google: paste the
   Client ID and Client Secret from step 1, and enable the provider.
3. Confirm your app's own `/auth/callback` route is in Supabase's Redirect
   URLs allow-list (see the Site URL/Redirect URLs step above) — this is
   what Supabase redirects back to *after* it finishes talking to Google.

Until all three are done, the Google button is safe to leave visible — it
just sends users to the friendly fallback message instead of erroring.

## Known limitations

- **No workout data has moved to Supabase.** Only the account/profile
  exists there; everything else (plan, history, goals, settings,
  insights) is still `localStorage`-only, unaffected by signing in or out.
- **`preferred_weight_unit` currently exists in two places** —
  `profiles.preferred_weight_unit` (new, this phase) and
  `user_settings.weight_unit` (from the previous phase's schema). Neither
  is wired to the other or to the app's actual localStorage settings yet;
  a future phase needs to decide which is authoritative once real sync
  begins.
- **Email confirmation requirement** depends on your Supabase project's
  default settings — if it's off, sign-up logs a user in immediately
  instead of showing the "check your email" message.
- **No account deletion or email-change flow** yet — only sign-up, login,
  logout, password reset, and profile field editing are implemented.
