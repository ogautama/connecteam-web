# Plan 16 — DISC lead visibility (hierarchy-scoped)

## Goal

Let a signed-in member see the DISC results submitted through `/tools/disc`
by prospects in **their own downline**, and nobody else's. Today the tool
writes `Lead` rows that nothing in the app can read back — the only way to
see a submission is Supabase Studio.

## The problem this plan has to solve first

**`Lead` rows have no owner.** Plan 04 ships a public, unauthenticated tool:
a submission carries `source`, `name`, `contact`, `inputs`, `result`,
`createdAt` — and no link to any `User`. "People under the same hierarchy"
has nothing to scope against until leads are attributed to someone in the
tree. So this plan is really two pieces: attribution, then visibility.

## Depends on

- [Plan 04](04-disc-tool.md) — the tool and the `Lead` writes.
- [Plan 06](06-member-shell.md) — the `/member` shell, nav, and role gating.
- [Plan 15](15-recruitment-tree.md) — `getDescendantUserIds()` and
  `canAccess()` in `src/lib/recruitTree.ts`, plus `resolveRecruiter()`, all
  of which already do exactly what's needed here and should be reused rather
  than reimplemented.

## Scope

### 1. Attribution

- **Referral links**: `/tools/disc?ref=<inviteCode>`. `User.inviteCode`
  already exists (Plan 02b) and `resolveRecruiter(inviteCode)` already
  resolves a code to a user id, falling back to the root leader when the
  code is absent or unknown.
- **`Lead.ownerId`** (nullable, FK to `User`) plus a migration. Resolved
  and written **server-side inside `saveDiscLead`** from the `ref` value —
  the client sends the code it was linked with, never an owner id.
- Members need somewhere to copy their own link from; the natural home is
  the Plan 06 dashboard, but scope the UI here so this plan is self-contained.

### 2. Visibility

- `/member/leads` — list of DISC leads where `ownerId` is in
  `getDescendantUserIds(viewer.id)`. That helper is self-inclusive, so an
  agent sees the leads from their own link, a leader sees their whole
  downline, and the root leader sees everything.
- Detail view — trait breakdown, profile copy, and the stored answer sheet,
  gated by the same check (`canAccess`).
- Scoping happens **in the query** (`where: { ownerId: { in: [...] } }`),
  never by fetching all rows and filtering after. No request parameter may
  widen the set.

## Open decisions

- **Unattributed leads.** Someone who reaches `/tools/disc` from the nav
  with no `?ref` has no obvious owner. `resolveRecruiter` already falls back
  to the root leader, which makes them root-only — simple and safe. The
  alternative is `ownerId = null` plus an "unassigned" queue leaders can
  claim from. Pick one before writing the migration; the fallback is
  cheaper, the queue is fairer to the team.
- **Existing rows.** There are already `Lead` rows in the dev database with
  no owner (including a test row named `ZZ TEST - hapus aja`). The migration
  has to either backfill them to root or leave them null; decide alongside
  the above.
- **Does an agent see the contact number, or only the profile?** The whole
  point is WhatsApp follow-up, so probably yes — but see the privacy note.

## Privacy constraint

The DISC form promises *"Data kamu cuma dipakai buat hubungi kamu lewat
WhatsApp."* This feature is what has to honour that. Concretely: no
export-all-leads button, no exposure outside the submitter's upline, and any
later change that widens who can read `contact` is a change to a promise
already made to the person, not just a permissions tweak.

## Out of scope

- **Members' own DISC results** — team members taking the test as an
  onboarding step, with leaders seeing their agents' profiles. That's a
  different data model (attached to `User`, not `Lead`) and deserves its own
  plan if wanted.
- **Calculator leads** (Plan 05). `Lead.source` already distinguishes them,
  so the same view can grow a filter later; this plan builds for `disc` only.
- Editing, deleting, or reassigning a lead to a different agent.

## Unit tests

- Scoping: build a small tree (root → leader → two agents). A leader sees
  their own and both agents' leads; agent A does not see agent B's; an
  unrelated branch sees none.
- Attribution: `resolveRecruiter` with a valid `inviteCode` returns that
  user; an unknown code and an absent code both fall back to root.
- The scoped query derives the viewer id from the session, and passing an
  `ownerId` in the request cannot widen the result set.
- Detail route: requesting a lead outside the viewer's subtree is rejected
  rather than rendered.

## Verification

- `npm run dev`, sign in as a leader and as an agent in the same tree,
  confirm each sees exactly the expected subset.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
