# Plan 13 — Member: Events (quest hub section)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route.
`/member/events` is deleted — this plan's content now fills the **Events**
section of the quest hub built by [Plan 07](07-member-onboarding.md),
reached from the sidebar at `/member/onboarding?section=events`, where it
sits **nested under References**. (The 2026-07-24 revision made this a
category *inside* the Referensi tab; the 2026-07-26 menu rework promoted it
to its own section with References as its visual parent.)

**Reversed 2026-07-29 — read this before the section below.** The
leader-only filtering requirement that used to be this plan's whole point is
gone: as part of the 2026-07-29 menu restructure, the team decided the
**only** role-gated item anywhere in the member nav is Add Member. Events
(`references-events` — moved position too, see
[Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet))
is now open to every agent, Power Monday included. `MEMBER_NAV`'s
`leaderExtras` flag on the Events item goes away along with the "Leaders"
badge. This is a deliberate product decision made in that session, not an
oversight — if Power Monday needs to go back to leader-only later, that's a
new decision to make explicitly, not a bug to fix. The "Source content" and
"Scope" sections below are historical context for what Power Monday *was*
gated on; the server-side filtering and its unit test are no longer part of
this plan's scope.

## Goal

Content for the Events section: rebuild of *Support System* as a real events
list. "Power Monday" was leader-only in the original source content, but per
the 2026-07-29 decision above it's now visible to every agent — no role
gating in this plan.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its sections rather than building its own page/route) — and specifically
[Plan 02b](02b-supabase-auth-google-oauth.md)'s `requireRole()` helper for
the leader-only item. Independent of Plans 08–12, 14.

## Source content (from sites.google.com/view/connecteam/support-system)

- Registration link: `sites.google.com/view/visionengine/home/system`.
- NextGen / Grand BOSS — inviting prospective partners to a business
  overview session (prerequisite: some prior step, per source copy).
- Group Selling — event to invite prospective clients (health/financial
  topic, named speaker).
- Power Monday — **(Leaders Only)**, 09:00–12:00.
- Page continues beyond what was captured (6992 chars total, ~4500
  captured) — **re-visit this page while logged in to confirm any
  additional recurring events** before implementing.

## Scope

- `src/content/events.ts` — typed structure: `{ title, description,
  schedule, registerUrl? }[]`. **No `leaderOnly` field** — see the reversal
  above.
- Events section (`references-events`): renders every event to every
  session. No role filtering.

## Unit tests

- Content module schema validation.

## Verification

`npm run dev`, log in, open **Events** from the sidebar (under References),
confirm all events render for both the seeded `agent` and `leader` users.
`npm run lint`, `npx tsc --noEmit`, `npm test`.
