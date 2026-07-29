# Plan 18 — IT & Content Admin (roles + editable living-document content)

## Status

Proposed 2026-07-29, not started. Scheduled **after** the quest-hub content
plans (07–14) ship their initial static content — "create this as new plan
after the website is done," per the person who requested it. Nothing here
blocks, or is blocked by, the 2026-07-29 menu restructure itself: the nav
tree's shape doesn't need to change to support this later, only individual
leaf items eventually gain a pointer to a content record instead of (or
alongside) inline static content.

## Goal

Two problems surfaced while restructuring the quest-hub sidebar:

1. Some pages are **living documents** — Contests & Campaigns, Recording,
   and likely others, need updating at least monthly. Today that means
   editing a `.ts`/`.tsx` file and shipping a deploy for every change, which
   doesn't scale to "monthly" and puts every edit behind a developer.
2. Some content is **shared across nav positions** — e.g. "Product Details"
   appears under both Selling ↳ Learning Center and References ↳ Recording
   (see [Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet)
   and [Plan 09](09-member-sell.md)'s revision note). It's the same page —
   editing it should update both places, not require keeping two copies in
   sync by hand.

This plan adds a narrow, database-backed content-editing capability for the
specific pages that need it, gated behind a new permission tier separate
from the existing agent/leader business role — without turning the whole
site into a general-purpose CMS.

## Depends on

[Plan 02b](02b-supabase-auth-google-oauth.md) (auth/role infrastructure),
[Plan 07](07-member-onboarding.md) (quest hub shell, nav tree). Functionally
wants Plans 08–14's initial static content to exist first, so there's real
content to migrate rather than empty placeholders — but nothing here is
technically blocked on their completion.

## Why not just reuse "leader"

Today's `Role` enum (`agent | leader`) is a **business** distinction — who's
allowed to add members, see commission data, and so on. Content editing is a
different axis: a top-earning leader might have no business editing content
pages, and (down the line) a non-agent staff member — IT, marketing — might
edit content without being part of the recruiting hierarchy at all. Reusing
`leader` for this would mean every leader can edit the public-facing
website, whether or not that's who was meant.

## Role model

A new permission tier, independent of `Role`:

```prisma
enum AdminLevel {
  none
  admin
  super_admin
}

model User {
  // ...existing fields
  adminLevel AdminLevel @default(none)
}
```

- **`super_admin`** can grant or revoke `admin` (and `super_admin`) on any
  user, regardless of their `agent`/`leader` status. There's no self-service
  path to become the first super admin — it's set directly in the database
  once, the same bootstrap problem the very first invited user already has
  (someone has to exist before any invite chain can start).
- **`admin`** can create, edit, and publish content blocks (below), but
  **cannot grant admin to anyone else**. Two shapes were on the table —
  admin-assigns-admin, or super-admin-only — and this plan recommends the
  restricted one: letting any admin mint more admins means one compromised
  or careless account can silently expand who has write access to the
  website, with no single point of review. Keeping grants to `super_admin`
  only means every permission change has one accountable owner. If that's
  too slow in practice — e.g. wanting 3–4 people able to onboard new content
  editors without going through one person every time — it's a small policy
  change later. Starting strict and loosening is safer than the reverse.
- This flag is orthogonal to `agent`/`leader` — an agent, a leader, or
  (later) someone with no business role at all can hold `admin`.

## Content model

```prisma
model ContentBlock {
  id            String   @id @default(cuid())
  key           String   @unique   // e.g. "product-details", "contests-campaigns"
  title         String
  body          String             // markdown or simple rich text — TBD at build time
  updatedAt     DateTime @updatedAt
  updatedBy     String
  updatedByUser User     @relation(fields: [updatedBy], references: [id])
}
```

- A nav leaf that should be admin-editable carries a `contentKey` instead of
  (or alongside) its static content. `MemberNavItem`
  (`src/lib/member/nav.ts`) gains an optional `contentKey?: string`; the
  page component resolves it against `ContentBlock` at render time.
- **Multiple nav items can carry the same `contentKey`.** This is the direct
  answer to the Product Details question: give Selling ↳ Learning Center's
  "Product Details" section and References ↳ Recording's "Product Details"
  section the same `contentKey`, and both read from — and an edit through
  either page's editor writes to — the same `ContentBlock` row. No join
  table needed; it's just two nav entries pointing at one key.
- Not every page moves to this model. Most Onboarding/Recruiting/Selling
  content is comparatively stable and stays in `src/content/*.ts` as today
  (the existing "no CMS for v1" decision in
  [00-overview.md](00-overview.md)) — this plan is scoped to pages already
  flagged as living documents, starting with Contests & Campaigns
  ([Plan 12](12-member-contests.md)) and Recording
  ([Plan 09](09-member-sell.md)'s new scope), not a wholesale migration.

## Admin UI

- `/member/admin/content/[key]` — list + edit form, gated by
  `adminLevel !== "none"` (a new `requireAdmin()` helper, same shape as the
  existing `requireRole()`).
- `/member/admin/roles` — `super_admin`-only, grant/revoke `admin`/
  `super_admin` on a user by email (reuses the lookup pattern from
  [Plan 02c](02c-leader-add-member.md)'s add-member flow).
- Every page that reads a `ContentBlock` shows a small "last updated {date}
  by {name}" line — living-document transparency for readers, and a natural
  nudge for whoever owns a page that's gone stale.
- Editing is a plain form (title + body), not a rich WYSIWYG — keep the
  first cut boring. A richer editor is easy to layer on later once the
  basic read/write/permission path is proven.

## Explicitly out of scope for v1

- Versioning/revision history on `ContentBlock` edits (no undo, no diff
  view) — noted here so it's a deliberate deferral, not a gap someone finds
  later.
- Image/file uploads inside content bodies — the existing Supabase Storage
  pattern ([Plan 17](17-mbti-self-motivation-result-upload.md)'s test-result
  upload) is the template to reuse when this is needed, not built here.
- A general-purpose block/page builder — this is content behind a
  key-value slot, not a CMS with its own layout system.

## Unit tests

- `AdminLevel` grant/revoke: only `super_admin` can call the grant action;
  `admin` calling it is rejected; the action re-checks the caller's level
  server-side (Server Actions are reachable by direct POST — same gotcha
  Plan 07 already notes for `requireMember()`).
- Content resolution: a nav item with a `contentKey` renders the matching
  `ContentBlock`; two nav items sharing a `contentKey` both reflect an edit
  to that one row; a missing key falls back to a "not yet written"
  placeholder rather than crashing.

## Verification

`npm run dev`, grant a test user `admin` (directly via seed/DB, since there's
no bootstrap UI), edit a content block, confirm both nav positions sharing
its key show the change; confirm a non-admin agent/leader gets a
403/redirect from the edit routes. `npm run lint`, `npx tsc --noEmit`,
`npm test`.
