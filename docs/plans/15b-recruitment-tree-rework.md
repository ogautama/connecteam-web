# Plan 15b — Recruitment tree rework (drop applicant promotion)

## Status

Not started. Amends [Plan 15](15-recruitment-tree.md) (see that doc's
superseded notice) — the tree/visibility model it built is unaffected and
stays as-is; only the `Applicant → User` promotion path changes.

## Goal

Remove the applicant-to-user promotion path Plan 15 originally built, now
that account creation happens exclusively through the leader-driven
pending-invite flow (Plan 02b/02c) instead of converting a recruitment-form
submission directly into a login-capable account.

## Depends on

Plan 02b — the `User.id` type/semantics change (Supabase auth id, not a
Prisma-generated cuid) affects `Applicant.recruiterId`'s target, so this
plan's schema change should land in the same migration pass as Plan 02b's,
same coordination note style as the original Plan 02/15 pairing.

## Background

Discussed and decided: applicants no longer auto-convert into accounts.
`Applicant` stays a pure submission record. Granting someone member access
is always a separate, manual action — a leader decides to add that person
via Plan 02c's form, independent of whatever the applicant's `status` says.
This also resolves the two-step-creation risk a Supabase-Auth-backed
`promoteApplicant` would otherwise have had (an external Admin-API call to
create the auth identity can't share a transaction with a Postgres write) —
by removing the coupling entirely rather than trying to make it atomic.

## Scope

- Schema: drop `Applicant.enrolledUserId` — nothing sets it anymore.
  `Applicant` keeps everything else as-is: `name`, `email`, `phone`, `dob`,
  `idCardPhotoKey`, `recruiterId`, `status`, timestamps. `status`
  (`submitted`/`accepted`/`rejected`) still exists for a leader to mark an
  application reviewed, but "accepted" no longer has any side effect on
  `User` — it's just a record of the leader's decision.
- Remove `promoteApplicant` from `src/lib/recruitTree.ts` and its test case.
- `getDescendantUserIds`, `canAccess`, `resolveRecruiter`,
  `reassignRecruiter` are **unchanged** — still tree-position-based, still
  correct, entirely independent of the auth rework.
- ID card photo storage: resolves the original "S3/R2/Vercel Blob — pick one
  when implementing" TODO as **Supabase Storage**, since it's already
  provisioned as part of Plan 02b's Supabase project. Signed/expiring URLs
  on read, gated by `canAccess` — a raw public URL would still bypass the
  tree permission model, same requirement as the original doc.

## Out of scope

The public recruitment form UI and the "My Team" view — unchanged, still
separate follow-on plans per Plan 15's original "Follow-on plans" section,
now consuming this reworked version instead.

## Unit tests

Same list as Plan 15's original, minus `promoteApplicant`'s case (removed):

- `getDescendantUserIds`, `canAccess`, `resolveRecruiter`,
  `reassignRecruiter` — all carry over unchanged, this logic isn't touched.
- Drop: `promoteApplicant` resulting `User`/`enrolledUserId` case.
- Drop: the two auth-adjacent cases already superseded by Plan 02b
  (`status: inactive` login rejection, session invalidation on
  deactivation) — Plan 02b's own doc owns whatever the equivalent
  Supabase-Auth-era behavior is, if any (see that plan's accepted
  revocation-lag tradeoff).

## Verification

- `npx prisma migrate dev` succeeds with `enrolledUserId` dropped.
- `npm test` passes.
