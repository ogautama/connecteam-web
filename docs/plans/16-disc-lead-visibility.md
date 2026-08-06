# Plan 16 — DISC lead visibility (hierarchy-scoped)

## Status

**Implemented 2026-08-06.** Mockup:
[spec-disc-leads.html](../design/spec-disc-leads.html) (open in a browser —
the dashboard referral card, the leads list in leader and agent views, and
the detail page). Same-day prerequisite shipped separately: the DISC test is
now **unlisted from the public site**
([PR #41](https://github.com/ogautama/connecteam-web/pull/41)) — the
marketing nav link and home teaser are gone, `/tools/disc` stays live and
public, so a member's referral link becomes the way prospects find the test.

Verified against the real dev database (migration applied, backfill
correct: 5 existing self-save rows matched by email → owner+taker set, 2
prospect rows → root fallback) and end to end in the browser, anonymously:
a `/tools/disc?ref=<inviteCode>` submission landed owned by that member, and
a submission with no `ref` fell back to root. The signed-in passes —
`/member/leads` in a leader vs. agent session, the referral card, the
Anggota badge — need a real Google session and are @ogautama's to run.

## Goal

Let a signed-in member see the DISC results submitted through `/tools/disc`
by prospects in **their own downline**, and nobody else's. Today the tool
writes `Lead` rows that nothing in the app can read back — the only way to
see a submission is Supabase Studio.

Two pieces: **attribution** (every lead gets an owner in the tree), then
**visibility** (`/member/leads`, scoped by the recruitment tree).

## Depends on

- [Plan 04](04-disc-tool.md) — the tool and the `Lead` writes.
- [Plan 06](06-member-shell.md) — the `/member` shell, nav, and role gating.
- [Plan 15](15-recruitment-tree.md) — `getDescendantUserIds()`, `canAccess()`
  and `resolveRecruiter()` in `src/lib/recruitTree.ts`, all of which already
  do exactly what's needed here and are reused, not reimplemented.

## Decisions (made 2026-08-06)

- **Referral links are the discovery path.** `/tools/disc?ref=<inviteCode>`;
  `User.inviteCode` already exists (Plan 02b) and `resolveRecruiter`
  already resolves a code to a user id. With the public listing gone
  (PR #41), a prospect reaching the test without a `ref` is the exception,
  not the rule.
- **Unattributed submissions fall back to the root leader** — the behaviour
  `resolveRecruiter` already has for an absent or unknown code. No
  "unassigned queue"; every lead lands owned, and only root sees the
  fallback ones. Chosen over the queue for simplicity; a claim flow can be
  its own plan if the fallback pile ever grows.
- **Members' own DISC results are included in the list.** A signed-in
  member's auto-saved result (today: `source "disc"`, `contact` = their
  account email) is attributed to **themselves** — so it shows up for them
  and their whole upline like any lead, wearing an **"Anggota" badge** to
  keep "my agent's own test" distinguishable from "a prospect my agent
  referred". This supersedes the earlier note that members' own results
  were out of scope.
- **The WhatsApp number is visible to every viewer in the upline**, agents
  included — follow-up is the point of collecting leads. The privacy
  constraint below still bounds it: nobody outside the submitter's upline,
  no export.
- **Existing ownerless rows are backfilled in the migration**: a row whose
  `contact` matches a `User.email` becomes that member's own result
  (owner + taker); everything else goes to root — including the
  `ZZ TEST - hapus aja` row (deleting it is a data chore for Studio, not
  this migration).

## Schema

```prisma
model Lead {
  // ...existing fields...
  ownerId     String
  owner       User    @relation("ownedLeads", fields: [ownerId], references: [id])
  takerUserId String?
  taker       User?   @relation("takenLeads", fields: [takerUserId], references: [id])

  @@index([source, ownerId, createdAt])
}
```

- **`ownerId` — NOT NULL.** The root fallback means every write path has an
  owner, so the column can be strict from day one. The migration is one
  file, three steps: add nullable → backfill (email match, then root) →
  `SET NOT NULL`. Raw SQL for the backfill, same style as earlier data
  migrations.
- **`takerUserId`** — set only when a signed-in member saved their own
  result; this is what the "Anggota" badge and any future "my own result"
  view key on. A member can also *own* prospect leads (via their link), so
  owner alone can't carry this distinction.
- `mbti` / `selfMotivation` rows (Plan 17 uploads) get owner = taker = the
  member, same as DISC self-saves — the backfill's email match covers the
  existing ones automatically.

## Scope

### 1. Attribution

- **`createLead`** (`src/lib/leads.ts`) gains `ownerId` (required) and
  `takerUserId` (optional).
- **`saveDiscLead`** (`src/app/tools/disc/actions.ts`) gains `ref?: string`
  and resolves the owner **server-side**; the client sends the code it was
  linked with, never an owner id:
  - session present → `ownerId = takerUserId = user.id`, `ref` ignored (a
    member opening someone's referral link is still saving *their own*
    result);
  - anonymous → `ownerId = await resolveRecruiter(ref)` (valid code → that
    member; absent/unknown → root).
- **`DiscTest.tsx`** reads `ref` from `useSearchParams()` once and passes it
  through both save paths.
- **`saveTestResultLead`** (`src/app/member/onboarding/actions.ts`) sets
  owner = taker = the member it already requires.
- **Referral card on the `/member` dashboard** (`MemberDashboard`): the
  member's full link (`<origin>/tools/disc?ref=<inviteCode>`) with a copy
  button, plus a one-liner saying results from it land in Leads.
  `CurrentUser` doesn't carry `inviteCode` — fetch it in the dashboard's
  server component with a narrow `prisma` select rather than widening the
  auth-layer type every request pays for.

### 2. Visibility

- **Nav**: a route-only item — `{ label: "Leads", href: "/member/leads" }` —
  for **all roles** (agents see their own referrals), placed after
  Directory, before Add Member.
- **`/member/leads`** — DISC leads where
  `ownerId ∈ getDescendantUserIds(viewer.id)` (self-inclusive: an agent
  sees their own link's leads, a leader their whole downline, root
  everything), newest first. Per row: name (+ "Anggota" badge when
  `takerUserId` is set), dominant-profile chip (`result.profileKey`),
  contact, owner ("via <name>" — which downline member's link), date.
  Scoping happens **in the query**
  (`where: { source: "disc", ownerId: { in: [...] } }`), never by fetching
  and filtering after; no request parameter may widen the set. Empty state
  points at the referral card.
- **`/member/leads/[id]`** — trait percentage bars, the profile copy
  (`DISC_PROFILES` / `TRAIT_META` from `src/content/disc-profiles`), and
  the stored answer sheet (`inputs.answers` against `DISC_QUESTIONS`).
  Outside the viewer's subtree → `notFound()`, same response as a
  nonexistent id, so the route isn't an existence oracle.
- **Contact rendering**: prospect rows hold WhatsApp numbers — render as a
  `wa.me` link (strip non-digits, leading `0` → `62`). Member self-saves
  hold the account **email** in `contact`; show it plainly, no `wa.me`.

## Privacy constraint

The DISC form promises *"Data kamu cuma dipakai buat hubungi kamu lewat
WhatsApp."* This feature is what has to honour that. Concretely: no
export-all-leads button, no exposure outside the submitter's upline, and any
later change that widens who can read `contact` is a change to a promise
already made to the person, not just a permissions tweak.

## Watch out for

- **Migration vs the shared dev/staging DB** (same note as Plan 20's enum):
  staging reads the same database, so apply the migration before or with
  the deploy — old code keeps working against the new columns (it never
  selects them), new code must not deploy first.
- **The backfill must land inside the same migration** as `SET NOT NULL`,
  and the email match must run before the root default so member self-saves
  don't get misfiled to root.
- **`saveDiscLead` stays a public server action** — it validates everything
  itself today and must keep doing so; `resolveRecruiter` already treats an
  unknown `ref` as "root", so a garbage code degrades safely.
- **`getLatestLead` is untouched** — the onboarding readback
  (`testResultState.ts`) still matches by `source` + `contact`.
- **Root must exist** — `resolveRecruiter` throws if no `recruiterId: null`
  user is found; true since Plan 02b's seed, just don't break it.

## Out of scope

- **Calculator leads** (Plan 05). `Lead.source` already distinguishes them;
  the list can grow a source filter when that tool ships.
- Editing, deleting, claiming, or reassigning a lead; any export.
- Pagination — the list ships as one newest-first page; add paging when
  volume demands it.
- A member-facing view of *their own* past results (the `takerUserId`
  rows make it cheap later, but it's its own small plan).

## Unit tests

- **Scoping**: root → leader → two agents tree; the leader sees their own
  and both agents' leads, agent A doesn't see agent B's, an unrelated
  branch sees none.
- **Attribution**: anonymous + valid `ref` → that member; anonymous +
  unknown or absent `ref` → root; signed-in + someone else's `ref` → owner
  is the session user, taker set, ref ignored.
- The scoped query derives the viewer from the session; an `ownerId` (or
  anything else) in the request cannot widen the result set.
- Detail route: an id outside the viewer's subtree → `notFound()`, not a
  render.
- "Anggota" badge keyed on `takerUserId`, not on contact shape.
- `wa.me` normalization: `0812…` → `62812…`, `+62` collapses, non-digits
  stripped.

## Verification

- `npx prisma migrate dev` — columns added, backfill correct (email-matched
  rows → that user, rest → root), `NOT NULL` holds.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
- Browser (localhost): anonymous `ref` link → submission lands under that
  member. The signed-in passes — leader vs agent seeing exactly their
  subsets, the referral card, the badge — are @ogautama's to run, since
  `/member/**` needs a real Google session.
