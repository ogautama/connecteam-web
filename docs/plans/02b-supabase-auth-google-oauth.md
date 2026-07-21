# Plan 02b — Supabase infra + Google OAuth

## Status

**Done** — implemented in [PR #7](https://github.com/ogautama/connecteam-web/pull/7).
Supersedes the database-hosting and auth-mechanism scope of
[Plan 02](02-data-auth.md) (see that doc's superseded notice). Written
2026-07-21 after deciding to consolidate off Neon + Auth.js onto Supabase +
Vercel, and off password login onto Google OAuth only — see "Why" below.

The real Google sign-in landing in `/member` step under "Verification"
below was verified end-to-end on 2026-07-21 once Plan 03's `/login` page
existed — an invited leader account signs in and reaches `/member`, a
no-profile account lands on `/not-invited`. Getting there surfaced one
trigger bug and a chain of environment/config gotchas, all captured in
[Local OAuth setup & live verification](#local-oauth-setup--live-verification-2026-07-21)
below.

## Why this replaces Plan 02's auth scope

Two decisions made together:

- **Fewer platforms**: consolidate Neon (DB) + a to-be-picked blob store onto
  Supabase (Postgres + Auth + Storage, one account/dashboard), hosted on
  Vercel. Prisma stays as the ORM — it doesn't care which company hosts the
  Postgres instance, this is purely a `DATABASE_URL` + schema change.
- **No passwords**: login becomes Google OAuth only, gated by a
  leader-created invite (Plan 02c) rather than self-service signup. This
  replaces Auth.js's Credentials provider, `bcryptjs`, and `passwordHash`
  entirely.

Accepted tradeoff from that discussion: revocation on deactivation no longer
takes effect on the user's *very next* request (Plan 02/15's original JWT
design goal) — Supabase's access tokens are self-contained and verified
without a DB round trip, so a deactivated user's existing token keeps
working until it expires (default ~1 hour). Confirmed acceptable — a 1–2
hour lag before access actually stops is fine.

## Goal

Give the app real accounts and roles via Supabase: Postgres hosted on
Supabase (via Prisma, same as before), Google OAuth as the only sign-in
method, and a **pending-invite gate** — nobody can reach `/member/**` unless
a leader added their email first (Plan 02c creates the invite; this plan
consumes it). No self-service signup exists.

## Depends on

Plan 01 (project scaffold).

## Scope

### Manual steps (you)

- Create a Supabase project. You'll need: `DATABASE_URL` (pooled, for the
  app runtime) and `DIRECT_URL` (unpooled, for `prisma migrate` — Supabase's
  pooler doesn't support the prepared statements Prisma migrations need),
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to the client,
  used for the invite-lookup/profile-creation trigger's elevated access).
  `.env.example` documents the shape.
- Google Cloud Console: create an OAuth 2.0 Web application client.
  Authorized redirect URI is Supabase's callback,
  `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client
  ID/secret into Supabase Dashboard → Authentication → Providers → Google.
  **Caveat**: while the OAuth consent screen is in "Testing" publishing
  status, Google itself only allows explicitly-added test-user emails to
  complete sign-in at all — a second, separate gate from this app's own
  invite system. Move the consent screen to "In production" (or "Internal"
  if a Google Workspace is available) before real agents need access.
- Create a Vercel project linked to this repo; add the same env vars above
  to its Preview and Production environments.

### Schema (`prisma/schema.prisma`)

- Drop `passwordHash` from `User` — no passwords anywhere now.
- `User.id` changes from `@default(cuid())` to a plain `String @id` with no
  default. It must equal Supabase's `auth.users.id` (a UUID), set by the
  trigger below — Prisma no longer originates it.
- Drop `Account`, `Session`, `VerificationToken` — Auth.js adapter leftovers,
  unused now that Auth.js itself is gone.
- Add `PendingInvite`: `id`, `email @unique`, `recruiterId`, `role` (`Role`
  enum, default `agent`), `invitedBy` (the leader's `User.id`), `createdAt`.
  Consumed (row deleted) once the invited email signs in and a matching
  `User` is created.

### Postgres trigger (raw SQL migration — Prisma can't express triggers)

A function + trigger `on_auth_user_created`, firing `AFTER INSERT ON
auth.users` (Supabase's own schema), that:

1. Looks up `PendingInvite` by `NEW.email`.
2. If found: inserts a `public.User` row with `id = NEW.id`, `email`,
   `recruiterId`, `role` from the invite; deletes the invite.
3. If not found: does nothing — the person now has a valid Supabase session
   but **no profile row**. This is the gate: no profile means no member
   access, checked explicitly below, not left to fall out accidentally.

Generate with `prisma migrate dev --create-only` and hand-edit the SQL file
to add the function/trigger, since this isn't expressible in
`schema.prisma` itself.

### App code

- `src/lib/supabase.ts` — `createServerClient`/`createBrowserClient`
  wrappers per `@supabase/ssr` conventions.
- Replaces `src/lib/auth.ts`: `getSession()` (reads the Supabase session),
  `getCurrentUser()` (session + a Prisma lookup on `public.User` by id —
  this is where "session exists but no profile" resolves to `null`, not a
  user), `requireRole(role)`, `signInWithGoogle()`, `signOut()`.
- Replaces `src/proxy.ts`: uses `@supabase/ssr`'s middleware helper to
  refresh the session cookie, then calls `getCurrentUser()` — **both**
  unauthenticated requests **and** authenticated-but-no-profile requests are
  rejected from `/member/**`. No-profile should redirect somewhere that
  explains "you haven't been added yet, ask your leader" — bouncing to
  `/login` after a successful Google sign-in would be confusing, since the
  person did successfully authenticate.
- Delete `src/lib/password.ts` and the `bcryptjs` dependency.
- Delete `src/app/api/auth/[...nextauth]/route.ts` and the `next-auth`/
  `@auth/prisma-adapter` dependencies.
- `src/lib/leads.ts` (`createLead`) is untouched — `Lead` isn't part of the
  auth rework.

### Seed script (`prisma/seed.ts`)

Can no longer seed password-based test users. Instead, seeds `PendingInvite`
rows for a small fixture set (root leader, two agents) keyed to real test
Google account emails you provide. Those accounts complete their own
`public.User` row via the trigger on first Google sign-in — manual
verification changes from "log in with seeded credentials" to "sign in with
a real Google test account that's on both the Google OAuth testing allowlist
and has a matching `PendingInvite`."

## Out of scope

- The leader "Add Member" UI that creates `PendingInvite` rows — Plan 02c.
  This plan's own testing inserts rows directly (seed script / Prisma
  Studio).
- Recruitment-tree changes — Plan 15b.
- Sending the invited person a notification email — Plan 02c note.

## Independence notes

Plans 03/06 depend on this plan's session-check *interfaces*, not its
implementation — develop against these stable signatures:

```ts
// src/lib/auth.ts
export function getCurrentUser(): Promise<{ id: string; role: Role } | null>
export function signInWithGoogle(): Promise<void>
export function signOut(): Promise<void>
export function requireRole(role: Role): Promise<{ id: string; role: Role }>
```

## Unit tests

- `getCurrentUser()`: session with a matching `public.User` row returns
  `{id, role}` (Supabase + Prisma mocked); session with no matching row
  returns `null`; no session returns `null`.
- `requireRole`: no session → redirect `/login`; session but no profile →
  redirect to the "not yet added" page; session + profile but wrong role →
  redirect `/member`; session + profile + matching role → passes.
- The trigger itself is DB-side SQL, not unit-testable in Vitest — needs an
  integration test against a real/local Supabase Postgres instance, same
  caveat Plan 15 already accepted for the recursive CTE (`$queryRaw` isn't
  meaningfully mockable either).

## Verification

- `npx prisma migrate dev` succeeds against Supabase's `DIRECT_URL`,
  including the trigger migration.
- Seed script creates the fixture `PendingInvite` rows.
- Manual: sign in with a test Google account that has a matching invite →
  lands in `/member` with the correct role. Sign in with a Google account
  that has no invite → rejected with a clear "not yet added" message, not a
  silent failure or a confusing bounce to `/login`.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.

## Local OAuth setup & live verification (2026-07-21)

The end-to-end sign-in was first exercised against the live Supabase project
while verifying Plan 03's `/login`. Order matters — each item below actually
blocked the flow in sequence. Recorded so it isn't rediscovered per
environment (localhost, Preview, Production).

### One code/schema bug (fixed)

- **`handle_new_auth_user()` didn't set `User."inviteCode"`.** That column is
  `NOT NULL` with **no DB default** — `@default(cuid())` is generated by Prisma
  in app code, never by Postgres — so the trigger's `INSERT` threw a not-null
  violation for every *invited* user, surfaced by Supabase Auth as the opaque
  `"Database error saving new user"`. Uninvited sign-ins never hit it (the
  trigger no-ops without a matching invite), which is exactly why this plan's
  own testing missed it. Fixed by migration
  `20260721130553_trigger_populate_user_invitecode` — the trigger now sets
  `inviteCode = gen_random_uuid()::text` (it's the sole creator of `User`
  rows since Plan 15b). Any new trigger/schema change must keep every
  `NOT NULL` column without a real DB default explicitly populated here.

### Environment / dashboard config (per environment)

- **`.env.local` DB password must be URL-encoded — including `$`.** Next's env
  loader (`@next/env` → dotenv-expand) treats `$name` as variable
  interpolation and silently *deletes* it, corrupting the password →
  `"password authentication failed"`. Percent-encode it: `$`→`%24` (alongside
  the `@`→`%40`, `/`→`%2F` etc. already noted). The same encoded value must go
  into the Vercel env var when deploying.
- **Supabase → Authentication → URL Configuration.** Set **Site URL** to the
  app origin (`http://localhost:3000` locally) and add the callback to
  **Redirect URLs** (`http://localhost:3000/**`). Symptom when missing: the
  OAuth round-trip returns to the site root with
  `error_code=bad_oauth_state` instead of reaching `/auth/callback`.
- **Google Cloud test-users allowlist is per-account.** While the consent
  screen is in *Testing*, *every* Google account you sign in with — not just
  the first — must be on the test-users list, independent of this app's invite
  gate (see the "Manual steps" caveat above). Google Auth Platform →
  Audience → Test users.

### The no-sign-out gotcha while testing

There's no sign-out button yet (Plan 06). A stale Supabase session cookie
keeps re-showing `/not-invited` for whatever account signed in last, and
Google may silently reuse that account instead of prompting. Test each
account in a fresh incognito window to force a clean OAuth round-trip.
