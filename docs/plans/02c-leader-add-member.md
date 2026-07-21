# Plan 02c — Leader: Add Member

## Status

**Done** in [PR #15](https://github.com/ogautama/connecteam-web/pull/15).
Shipped as described below. Notes on what the implementation settled that the
plan left open:

- **Lives at `/member/admin/add-member`** inside Plan 06's member shell (that
  plan landed first, so the standalone-layout fallback wasn't needed) and is
  the first `leaderOnly: true` entry in `MEMBER_NAV` — the mechanism Plan 06
  built and predicted nothing would use yet. It's kept last in the nav so it
  reads as a leader tool rather than a ninth IA section; agents see neither
  the nav link nor the dashboard card.
- **Invite logic sits in `src/lib/invites.ts`**, away from the server action,
  so the duplicate rules and the recruiter fallback are unit-testable without
  a session. `createPendingInvite` returns a
  `{ ok: false, reason: "existing-user" | "existing-invite" }` result rather
  than throwing — the caller renders it inline. A raced `P2002` on the email
  unique index maps to the same duplicate result, since the index is the real
  guard and a 500 would be the wrong answer either way.
- **`requireRole("leader")` runs in the action as well as the page.** Server
  Actions are reachable by direct POST, so the page's guard can't be the only
  one.
- **Recruiter defaults to the acting leader**, with the invite-code text
  field as the documented fallback for someone not in the dropdown — an
  unknown or blank code rides `resolveRecruiter`'s existing fallback to root
  instead of failing the submit.
- **Success replaces the form** with a confirmation naming the invited email
  plus a reminder that nothing notifies them; "Tambah member lagi" remounts
  the form to reset it (`useActionState` state only changes on the next
  submit, so a fresh key is the cheapest reset).

## Goal

Give leaders a page to pre-authorize a new member's email before that person
ever signs in — the only way a `PendingInvite` (Plan 02b) gets created
through the UI instead of Prisma Studio. Under the Google-OAuth-only model,
this is how anyone besides the seeded fixture users gets access at all.

## Depends on

Plan 02b (`PendingInvite` model, `requireRole`). Soft-depends on Plan 06 for
the member shell/nav to place this page in — can ship with a minimal
standalone layout (same pattern Plan 03's `/login` uses if Plan 02b hasn't
merged yet) if Plan 06 hasn't landed, and move into the real nav once it
does.

## Scope

- A leader-only page (e.g. `/member/admin/add-member`), gated by
  `requireRole("leader")` from Plan 02b.
- Form: **email** (text input), **recruiter** (dropdown of existing `User`
  rows by name/email, with manual entry of a recruiter's invite code as a
  fallback — mirrors `resolveRecruiter`'s existing fallback-to-root
  behavior, so an invalid/blank entry doesn't hard-fail), **role**
  (`agent`/`leader` select, default `agent`).
- Submit creates a `PendingInvite` row with `invitedBy` set to the acting
  leader's id. A duplicate email (already an existing `User` or an existing
  `PendingInvite`) shows a clear inline error instead of surfacing a raw DB
  constraint failure.
- A confirmation state after successful submit. This plan does **not** send
  the invited person any notification — they find out through the leader
  directly (WhatsApp, in person, etc.) and sign in with Google themselves.
  An automated invite email is a reasonable follow-on, not required here.

## Out of scope

- Editing or revoking a pending invite.
- Bulk import.
- The future admin dashboard for promoting an existing agent to leader —
  still deferred, per Plan 15's original "Out of scope" (raw DB/Prisma
  Studio access is fine for that until it's built).

## Independence notes

Needs Plan 02b's `PendingInvite` Prisma model and `requireRole` to exist;
can be developed against a mocked Prisma client before Plan 02b's live
Supabase connection is wired up, same as Plan 02b's own independence notes.

## Unit tests

- Form validation: empty/invalid email rejected before submit.
- Submit calls the invite-creation helper with the expected shape
  (`email`, `recruiterId`, `role`, `invitedBy`).
- Duplicate email (existing `User` or `PendingInvite`) renders an inline
  error, doesn't throw.
- A non-leader session never sees the form — redirected before render.

## Verification

- `npm run dev`, sign in as the seeded leader test account, add a member by
  email, confirm a `PendingInvite` row exists (Prisma Studio), and confirm a
  second submit with the same email is rejected in the UI rather than
  crashing.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
