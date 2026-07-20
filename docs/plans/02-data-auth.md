# Plan 02 — Data & auth layer

## Status

**Done, but superseded (2026-07-21)** — implemented together with
[Plan 15](15-recruitment-tree.md) in
[PR #5](https://github.com/ogautama/connecteam-web/pull/5), per the
coordination note below. Session strategy ended up JWT rather than
database (see Plan 15's "Auth changes" section for why); Prisma also
needed `@prisma/adapter-pg` since Prisma 7 dropped the built-in query
engine — neither is a scope change, both are noted where relevant below.

**Kept as a historical record of what actually shipped.** The team decided
to consolidate off Neon + Auth.js/Credentials onto **Supabase + Vercel with
Google OAuth only** (fewer platform accounts to manage, no password
storage). The database-hosting and auth-mechanism scope below is replaced
by [Plan 02b](02b-supabase-auth-google-oauth.md); the leader-driven "who's
allowed to sign in" UI is [Plan 02c](02c-leader-add-member.md). The `Lead`
model and `createLead()` (unrelated to auth) are unaffected and stay as
described here.

## Goal

Give the app real accounts, roles, and lead storage: Prisma schema against
Neon Postgres, Auth.js credentials login, and a role-gating helper for
`/member/**`. This plan is almost entirely non-UI logic, so it's easy to unit
test in isolation.

## Depends on

Plan 01 (project scaffold).

## Scope

- `prisma/schema.prisma`: `User` (id, email, passwordHash, name, role
  `agent`|`leader`, createdAt) and `Lead` (id, source `calculator`|`disc`,
  name, contact, inputs `Json`, result `Json`, createdAt). Already drafted
  in the working tree. **Coordinate with Plan 15** before running the first
  `prisma migrate dev`: Plan 15 adds `position`/`status`/`recruiterId`/
  `inviteCode` to `User` plus a new `Applicant` model, and wants those in
  the same initial migration rather than a follow-up one — check whether
  Plan 15 has merged/landed first so this isn't migrated twice.
- Neon Postgres project + `DATABASE_URL` in `.env.local` — **manual step for
  you**: create the project at neon.tech, I need the connection string
  before migrations can run. `.env.example` documents the shape.
- `prisma migrate dev` to create the initial migration, committed to
  `prisma/migrations/`.
- `src/lib/auth.ts` — Auth.js v5 config: Credentials provider verifying
  email + password (bcrypt compare) against `User`, adding `role` to the
  session. **JWT session strategy** — Auth.js requires this for a
  Credentials-only setup (database sessions throw at runtime; see Plan 15's
  doc for why). Immediate revocation of a deactivated user is instead
  handled in the `jwt()` callback, which re-checks `status` on every request
  and clears the cookie if inactive — see Plan 15's "Auth changes" section.
- `src/lib/password.ts` — `hashPassword`/`verifyPassword` wrapping bcryptjs.
- `src/lib/leads.ts` — `createLead(input)` — thin wrapper around
  `prisma.lead.create`, typed by source.
- `proxy.ts` (Next.js 16 renamed `middleware.ts` — see `src/proxy.ts`) —
  protects `/member/**`: redirects unauthenticated requests to `/login`.
  `requireRole(role)` ended up in `src/lib/auth.ts` instead of `proxy.ts`
  itself (per the Next.js auth guide's DAL recommendation — proxy.ts
  explicitly warns against other modules depending on it); other pages use
  it for leader-only content (starting Plan 06 and Plan 13).
- Seed script (`prisma/seed.ts`): one `agent` user and one `leader` user
  with known test credentials, for manual verification and for Plan 06's
  gating tests.

## Out of scope

Any UI (login form UI is Plan 03; member shell UI is Plan 06).

## Independence notes

This plan only needs `DATABASE_URL` to run migrations/seed; the code (schema,
auth config, helpers) can be written and unit-tested with a mocked Prisma
client before a live Neon connection exists. Plans 03/04/05/06 that consume
`auth()`/`createLead()` can develop against this plan's exported types even
if this plan merges after them, as long as the function signatures below are
stable:

```ts
// src/lib/auth.ts
export function auth(): Promise<Session | null>

// src/lib/leads.ts
export function createLead(input: {
  source: "calculator" | "disc";
  name: string;
  contact: string;
  inputs: unknown;
  result: unknown;
}): Promise<Lead>
```

## Unit tests

- `password.ts`: hash then verify round-trips correctly; wrong password
  fails.
- `auth.ts` Credentials `authorize()`: valid creds return a user with role;
  invalid email/password return null (Prisma mocked). (Plan 15 adds a further
  case: `status: inactive` users fail `authorize()` even with correct
  credentials — not required for this plan's own tests, noted here so it
  isn't missed.)
- `proxy.ts`: unauthenticated request to `/member/x` redirects to
  `/login`; `requireRole`: authenticated `agent` request wrapped in
  `requireRole("leader")` is rejected; `leader` request passes.
- `leads.ts`: `createLead` calls `prisma.lead.create` with the expected
  shape (Prisma mocked).

## Verification

- `npx prisma migrate dev` succeeds against your Neon `DATABASE_URL`.
- `npx prisma db seed` creates the two test users.
- `npm test` passes (all above, with Prisma client mocked — no live DB
  needed for the test suite itself).
- Manual: a small temporary script or `prisma studio` confirms seeded rows.
