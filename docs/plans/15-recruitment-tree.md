# Plan 15 — Recruitment tree & applications

## Status

**Done** — implemented together with [Plan 02](02-data-auth.md) in
[PR #5](https://github.com/ogautama/connecteam-web/pull/5), per the
"Independence notes" below. Its fields aren't wired into any UI yet (per
"Out of scope"); the follow-on plans listed below are still not started.

## Goal

Give every `User` a position in a recruiter tree, add a pre-enrollment
`Applicant` model for the online recruitment form (name, contact, DOB, ID
card photo), and a data-access helper that answers "can viewer X see this
person's data?" based on tree position. This is the data/authorization layer
only — the public application form and a member-facing "my team" view are
separate follow-on plans that consume it (see "Follow-on plans" below).

## Depends on

Plan 02 (Prisma schema, Auth.js, `User` model). Plan 02 hasn't shipped code yet,
so this plan's schema additions and one session-strategy change (below) should
land as part of/immediately after Plan 02 rather than as a later migration.

## Background / decisions this plan encodes

- **Tree**: self-referential `recruiterId` on `User`. Exactly one root user
  (the single top leader, `recruiterId = null`) — everyone else has one.
  Recruiter assignment is self-service via a personal invite link/code; no
  referral code defaults to the root user.
- **Reassignment is a supported, ongoing operation** — not just before
  enrollment, but after an application is accepted too. This rules out a
  materialized-path approach (reassigning a node would require rewriting
  that node's and every descendant's path). Use a plain adjacency list
  (`recruiterId`) and compute descendants at query time with a recursive
  CTE — reassignment then costs a single-row `UPDATE`, nothing cascades.
- **Visibility = tree position, not role.** Viewer X can see records owned
  by `{X} ∪ descendants(X)`. The root's descendant set is everyone, so "the
  top leader sees all" falls out of the same rule with no special case. This
  is independent of `role` (member-content gating) and `position` (rank) —
  neither affects who can see whose recruitment data.
- **Departed users**: soft-delete only. `User` rows, `recruiterId`, and all
  historical data stay exactly as they are when someone leaves — the tree
  must not change shape. Only that user's own ability to log in / act is
  revoked.
- **Position** (`Agent` / `AAB` / `AB`): a separate, manually-set rank field.
  Declared in that order so Postgres's native enum ordering
  (`Agent < AAB < AB`) is usable directly in comparisons later. No
  achievement-calculation engine yet — just an admin-editable column.
- **`role` (`agent`/`leader`) stays as-is**, per Plan 02, unrelated to the
  above three.

## Scope

### Schema (`prisma/schema.prisma`)

```prisma
enum Position    { Agent AAB AB }
enum UserStatus  { active inactive }

model User {
  // ...existing fields (id, email, passwordHash, name, role, createdAt)
  position    Position   @default(Agent)
  status      UserStatus @default(active)
  inviteCode  String     @unique @default(cuid())
  recruiterId String?
  recruiter   User?      @relation("Recruiter", fields: [recruiterId], references: [id])
  recruits    User[]     @relation("Recruiter")
}

enum ApplicantStatus { submitted accepted rejected }

model Applicant {
  id             String          @id @default(cuid())
  name           String
  email          String
  phone          String
  dob            DateTime
  idCardPhotoKey String          // blob storage key, not the file itself
  recruiterId    String
  recruiter      User            @relation(fields: [recruiterId], references: [id])
  status         ApplicantStatus @default(submitted)
  enrolledUserId String?         @unique
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}
```

ID card photos are stored in blob storage (S3/R2/Vercel Blob — pick one when
implementing), never as bytes in Postgres. `idCardPhotoKey` is an opaque
reference; a signed/expiring URL is issued on read, gated by the same
authorization check as the rest of the record — a raw public URL would
bypass the whole tree permission model.

### Data-access helpers (`src/lib/recruitTree.ts`)

- `getDescendantUserIds(userId): Promise<string[]>` — recursive CTE
  (`WITH RECURSIVE`) via `prisma.$queryRaw`, walking `recruiterId` down from
  `userId`.
- `canAccess(viewerId, ownerId): Promise<boolean>` — `ownerId` is `viewerId`
  or in its descendant set.
- `resolveRecruiter(inviteCode?: string): Promise<string>` — looks up the
  `User` by `inviteCode`; falls back to the root user (`recruiterId = null`)
  when missing/invalid.
- `reassignRecruiter(targetId, newRecruiterId): Promise<void>` — updates
  `recruiterId` on a `User` or `Applicant`; first walks `newRecruiterId`'s
  ancestor chain and rejects the change if `targetId` appears in it (cycle
  guard).
- `promoteApplicant(applicantId, newUserFields): Promise<User>` — creates the
  `User` row with `recruiterId` copied from the applicant's `recruiterId`,
  sets `Applicant.enrolledUserId`, applicant's own history is left in place.

### Auth changes (amends Plan 02)

- **Revised during implementation:** Auth.js v5 throws at runtime
  (`UnsupportedStrategy`, see `@auth/core`'s `assertConfig`) if the
  Credentials provider is combined with database sessions and no other
  provider type is configured — Credentials-authenticated users aren't
  persisted through the adapter, so there's no adapter session row to
  attach to. Database sessions as originally planned here aren't actually
  usable with our Credentials-only setup.
- Instead: **JWT sessions**, with the `jwt()` callback re-checking `status`
  in Postgres on *every* request (not just at sign-in) and returning `null`
  when a user is inactive. Auth.js clears the session cookie immediately
  when `jwt()` returns null (see `@auth/core/lib/actions/session.js`), which
  gets the same "revocation takes effect on the very next request"
  guarantee the original database-session plan was after, at the same
  per-request DB cost. `@auth/prisma-adapter` is still wired up (harmless
  with JWT sessions) for future OAuth providers.
- `authorize()` and the `jwt()` callback reject/clear sessions where
  `status !== active`.
- Deactivating a user (`status = inactive`) relies on that same `jwt()`
  check — no session rows to delete under JWT sessions.

### Seed data

Extend Plan 02's seed script with a small fixture tree (root leader → 2 mid
users → 1 leaf) so descendant/visibility queries have something real to
test against.

## Out of scope

- The public recruitment form UI (`/join` currently just embeds a Google
  Form per Plan 03 — replacing it with the real form is a follow-on plan).
- Any member-facing "my team"/downline view.
- Admin UI for setting `position` or approving/rejecting applicants (raw
  DB/Prisma Studio access is fine for now, per "set manually").
- Automatic position/achievement calculation.

## Follow-on plans (not this one)

- **Recruitment application form** (`/join`) — replaces Plan 03's Google Form
  embed; captures `Applicant` data, resolves `recruiterId` via
  `resolveRecruiter(inviteCode)`. Depends on this plan.
- **Member: My Team** — a new `/member/team` section (same pattern as
  Plans 07–14) showing a user's own subtree, using `getDescendantUserIds` /
  `canAccess`, plus applicant accept/reject and reassignment actions.
  Depends on this plan and Plan 06.

## Independence notes

Can be built against Plan 02's schema draft directly (both are uncommitted
still) — treat this as additive fields on the same migration rather than a
separate one, since Plan 02 hasn't shipped yet. If Plan 02 merges first, this
becomes a normal follow-up migration.

## Unit tests

- `getDescendantUserIds`: returns the correct set for a multi-level fixture
  tree; returns everyone for the root user; returns just `[self]` for a leaf.
- `canAccess`: true for self, true for any descendant, false for a sibling's
  subtree, false for an ancestor (visibility is downward-only).
- `resolveRecruiter`: valid code resolves to that user; missing/invalid code
  falls back to root.
- `reassignRecruiter`: rejects a reassignment that would create a cycle;
  succeeds and is immediately reflected in `getDescendantUserIds` otherwise.
- `promoteApplicant`: resulting `User.recruiterId` matches the applicant's
  `recruiterId`; `Applicant.enrolledUserId` is set; applicant row is
  untouched otherwise.
- Auth: login fails for `status: inactive` even with correct credentials;
  deactivating a user invalidates their existing session.

## Verification

- `npx prisma migrate dev` succeeds with the new fields/models.
- Seed script produces the fixture tree.
- `npm test` passes (Prisma mocked or against a local test DB for the
  recursive CTE, since `$queryRaw` isn't meaningfully mockable — a real
  Postgres instance, e.g. local Docker or a Neon branch, is needed for that
  specific test).
