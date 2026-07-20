# PR-02 — Data & auth layer

## Goal

Give the app real accounts, roles, and lead storage: Prisma schema against
Neon Postgres, Auth.js credentials login, and a role-gating helper for
`/member/**`. This PR is almost entirely non-UI logic, so it's easy to unit
test in isolation.

## Depends on

PR-01 (project scaffold).

## Scope

- `prisma/schema.prisma`: `User` (id, email, passwordHash, name, role
  `agent`|`leader`, createdAt) and `Lead` (id, source `calculator`|`disc`,
  name, contact, inputs `Json`, result `Json`, createdAt). Already drafted
  in the working tree. **Coordinate with PR-15** before running the first
  `prisma migrate dev`: PR-15 adds `position`/`status`/`recruiterId`/
  `inviteCode` to `User` plus a new `Applicant` model, and wants those in
  the same initial migration rather than a follow-up one — check whether
  PR-15 has merged/landed first so this isn't migrated twice.
- Neon Postgres project + `DATABASE_URL` in `.env.local` — **manual step for
  you**: create the project at neon.tech, I need the connection string
  before migrations can run. `.env.example` documents the shape.
- `prisma migrate dev` to create the initial migration, committed to
  `prisma/migrations/`.
- `src/lib/auth.ts` — Auth.js v5 config: Credentials provider verifying
  email + password (bcrypt compare) against `User`, adding `role` to the
  session. **JWT session strategy** — Auth.js requires this for a
  Credentials-only setup (database sessions throw at runtime; see PR-15's
  doc for why). Immediate revocation of a deactivated user is instead
  handled in the `jwt()` callback, which re-checks `status` on every request
  and clears the cookie if inactive — see PR-15's "Auth changes" section.
- `src/lib/password.ts` — `hashPassword`/`verifyPassword` wrapping bcryptjs.
- `src/lib/leads.ts` — `createLead(input)` — thin wrapper around
  `prisma.lead.create`, typed by source.
- `middleware.ts` — protects `/member/**`: redirects unauthenticated
  requests to `/login`; exposes a `requireRole(role)` helper other pages
  can use for leader-only content (used starting PR-06 and PR-13).
- Seed script (`prisma/seed.ts`): one `agent` user and one `leader` user
  with known test credentials, for manual verification and for PR-06's
  gating tests.

## Out of scope

Any UI (login form UI is PR-03; member shell UI is PR-06).

## Independence notes

This PR only needs `DATABASE_URL` to run migrations/seed; the code (schema,
auth config, helpers) can be written and unit-tested with a mocked Prisma
client before a live Neon connection exists. PRs 03/04/05/06 that consume
`auth()`/`createLead()` can develop against this PR's exported types even
if this PR merges after them, as long as the function signatures below are
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
  invalid email/password return null (Prisma mocked). (PR-15 adds a further
  case: `status: inactive` users fail `authorize()` even with correct
  credentials — not required for this PR's own tests, noted here so it
  isn't missed.)
- `middleware.ts`: unauthenticated request to `/member/x` redirects to
  `/login`; authenticated `agent` request to a route wrapped in
  `requireRole("leader")` is rejected; `leader` request passes.
- `leads.ts`: `createLead` calls `prisma.lead.create` with the expected
  shape (Prisma mocked).

## Verification

- `npx prisma migrate dev` succeeds against your Neon `DATABASE_URL`.
- `npx prisma db seed` creates the two test users.
- `npm test` passes (all above, with Prisma client mocked — no live DB
  needed for the test suite itself).
- Manual: a small temporary script or `prisma studio` confirms seeded rows.
