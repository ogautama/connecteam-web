# Plan 07c — Join Us → Isi Data: link an existing member's email (no auto-invite)

## Status

**Built** in [PR #26](https://github.com/ogautama/connecteam-web/pull/26),
2026-07-31, merged into the Plan 07 branch — reached `main` 2026-08-05 with
[PR #18](https://github.com/ogautama/connecteam-web/pull/18). **Verified end
to end** against the dev DB: submitting /join as an existing member's email
shows the "already a member" screen, uploads nothing and creates no
Applicant row; `/auth/callback?next=` redirects correctly; and on 2026-08-05
@ogautama completed the full round trip by hand — signed in, landed on
`/member/isi-data` prefilled from the draft, re-picked the four documents,
and saved, producing the `MemberIntake` row and its `join-isi-data`
progress marker.

Two things in that account no longer describe current behaviour, later the
same day: the `join-isi-data` progress marker is gone (the checklist item
moved to the account menu, so `submitJoinData` stopped writing it and a
migration deleted the row), and the destination page is now titled
**"Profile"** — and as of 2026-08-06 so is its route, `/member/profile`.
The handoff and its `?next=` redirect are still untouched: `/member/isi-data`
308s to the new path (`next.config.ts`), query string included. See "The
checklist shrank from 7 items to 4" in
[07-member-onboarding.md](07-member-onboarding.md).

That last leg took one extra fix outside this plan: the *applicant*-intake
leader policy queried the `User` table directly in its `USING` clause,
which Postgres privilege-checks on every `SELECT` against
`storage.objects` — including the existence check `upsert: true` performs
on the unrelated member-intake bucket. So every member save failed with
`permission denied for table User` until the policy was rewritten against a
`SECURITY DEFINER` helper, in
`prisma/migrations/20260731120123_fix_applicant_intake_leader_policy_security_definer`.

Amends [Plan 07](07-member-onboarding.md)'s "Isi Data"
(`/member/profile`, `JoinDataForm.tsx`) and the public "Join Us" form
(`/join`, `ApplicationForm.tsx`) — sits alongside the existing accepted-
Applicant→Isi-Data read-only link (built 2026-07-30) as a second linking
path, for someone who submits /join under an email that's already a real
member.

**Follow-on decided 2026-08-05, not built:** where a member *finds* Isi
Data changes — out of the Onboarding checklist, into the account dropdown
as "Profile". See
[spec-profile-menu.html](../design/spec-profile-menu.html) and the entry in
[Plan 00's open items](00-overview.md). Nothing in this plan's own linking
flow changes; `/login?next=/member/profile` still lands on the same page.

## Depends on

- [Plan 07](07-member-onboarding.md) — owns `/member/profile` and the
  public `/join` application, including the existing accepted-Applicant
  read-only link this plan sits alongside.
- [Plan 02b](02b-supabase-auth-google-oauth.md) — the Google OAuth sign-in
  flow (`/login`, `/auth/callback`) this plan adds a generic `next`
  redirect param to.

## Background

Two prior decisions from the same 2026-07-30/07-31 working session as the
accepted-Applicant link, that this plan builds on directly:

- The user explicitly ruled out auto-inviting from a public /join
  submission — "biar leader yang menambah manual anggotanya" (let the
  leader add members manually) — so nothing here creates a `PendingInvite`
  or a `User`.
- The user separately confirmed the member-side Isi Data auto-invite
  behavior (`submitJoinData` pre-authorizing "Email Aktif" as an agent) is
  unrelated and untouched by this.

New problem this plan solves: today, if someone fills out the public
/join form using an email that already belongs to a real `User` (they're
already a member — maybe re-applying, maybe confused about which form to
use), `submitApplication` creates an `Applicant` row for them anyway, with
no signal back to them that they already have an account, and no way to
reuse what they just typed on their real Isi Data page.

## Goal

When /join's "Email Aktif" matches an existing `User`, don't create an
`Applicant`. Tell them they already have an account, get them to log in,
and land them on `/member/profile` with the text fields they just typed
pre-filled — without asking them to retype 11 fields, and without silently
creating a duplicate/orphaned Applicant record for an existing member.

## Design decisions

- **Check happens once, server-side, at submit** (when they click
  "Kirim"), not live per-keystroke — a live check would let anyone
  enumerate which emails are already members.
- **Check happens before any photo upload starts** — folding it into the
  existing `submitApplication` call (which runs after uploads) would waste
  4-5 real Storage uploads only to discard them.
- **Draft = the 11 text fields only, never photo keys.** File inputs
  can't be repopulated from stored data by JavaScript (a deliberate
  browser security boundary) — a "restore the File objects" approach
  isn't possible regardless of where the data is stashed. The member
  re-picks their files after logging in.
- **The post-login redirect (`next` param) is added as a generic, reusable
  mechanism** on `/login` / `/auth/callback`, not special-cased to this
  one flow.
- **Precedence on the Isi Data page**: existing `MemberIntake` (`saved`)
  wins over everything → a matching fresh draft → the existing
  accepted-Applicant read-only link (Plan 07, 2026-07-30) → blank form. A
  draft is only applied if its `activeEmail` matches the signed-in
  member's own email — never someone else's leftover browser data.

## Scope

### Phase 1 — generic post-login redirect

- `src/app/auth/callback/route.ts`: read a `next` query param; redirect
  there instead of the hardcoded `/member` if it's present and starts
  with `/` (reject anything else — avoid an open redirect). Falls back to
  `/member` otherwise, unchanged from today.
- `src/lib/auth-browser.ts`: `signInWithGoogle` takes an optional
  `next?: string`, appended to the `redirectTo` callback URL.
- `src/app/login/page.tsx`: read `searchParams.next`, pass to
  `LoginForm`.
- `src/app/login/LoginForm.tsx`: accept optional `next?: string`, pass
  through to `signInWithGoogle`.

### Phase 2 — detect "already a member" on /join, before uploads

- `src/lib/invites.ts`: add `userExistsForEmail(email: string):
  Promise<boolean>` — same `normalizeEmail` + `prisma.user.findUnique`
  lookup `createPendingInvite` already does, exposed as a boolean.
- `src/app/join/actions.ts`: new server action `checkExistingMember
  (activeEmail: string): Promise<boolean>`, calling
  `userExistsForEmail`. `submitApplication` itself is unchanged.
- `src/app/join/ApplicationForm.tsx`: in `handleSubmit`, after the
  existing field/file validation and before `uploadIfNeeded` runs, call
  `checkExistingMember`. If true — skip uploads and `submitApplication`
  entirely, save the draft (Phase 3), show a new "you already have an
  account" screen linking to `/login?next=/member/profile`. If false —
  unchanged.

### Phase 3 — the draft handoff

- `src/lib/joinDraft.ts` (new, client-only): `saveJoinDraft`,
  `readJoinDraft`, `clearJoinDraft` wrapping `sessionStorage` under one
  namespaced key, storing the 11 text fields plus `activeEmail`.
- `ApplicationForm.tsx` calls `saveJoinDraft` in the "already a member"
  branch.
- `src/app/member/profile/JoinDataForm.tsx`: on mount, if there's no
  `saved` MemberIntake, read the draft; if present and its `activeEmail`
  matches this member's own email, prefill the form (files empty, note
  explaining re-upload is needed), then clear the draft immediately
  (consumed once). Takes priority over the existing linked-Applicant
  read-only branch — goes to the editable form, not a read-only summary,
  since files are still required.

## Out of scope

- Restoring already-selected photo files across the login redirect — not
  possible without a temp-upload-and-reconcile design (uploading on
  file-select instead of at submit, then moving/relinking Storage objects
  post-login). Flagged as a possible follow-on if re-uploading turns out
  to be a real friction point, not built here.
- Any change to the existing member-side Isi Data auto-invite behavior
  (`submitJoinData` pre-authorizing "Email Aktif") — unrelated,
  explicitly confirmed out of scope by the user 2026-07-30/31.
  **Superseded 2026-08-05** (after this plan shipped, not by it): "Email
  Aktif" is now locked to the signed-in account and re-derived server-side,
  so that `createPendingInvite` call can no longer pre-authorize anything.
  It was fine as a one-time onboarding step, but the same form became a
  Profile page members revisit. Nothing about *this* plan's flow changed —
  the draft handoff and `?next=` redirect work exactly as described.
- Any change to the existing accepted-Applicant → Isi Data read-only link
  (Plan 07, 2026-07-30) — this plan adds a second, higher-precedence
  source (the draft), doesn't alter that one.

## Unit tests

- `userExistsForEmail` — true for a User row, false otherwise
  (case/whitespace-normalized email).
- `checkExistingMember` — delegates correctly.
- `ApplicationForm`: on an existing-member email, uploads and
  `submitApplication` are never called; a draft is stashed; on a
  non-member email, behavior is unchanged from today.
- `JoinDataForm` / Isi Data page: a present, email-matching draft
  prefills the form and is cleared after one read; a draft under a
  different email is ignored; an existing `saved` MemberIntake always
  wins over any draft.
- `/auth/callback` route (check whether a test already exists first):
  `next` redirect, and that a non-`/`-prefixed `next` value falls back to
  `/member`.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm test -- --run` all clean.
- Manual end-to-end in the browser: submit /join with an email that
  already belongs to a real `User` in the dev DB → see the "already a
  member" screen → log in → land on `/member/profile` pre-filled with
  the typed answers, prompted to re-upload files.
