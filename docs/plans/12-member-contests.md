# Plan 12 — Member: Contests & Campaigns (quest hub section)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route.
`/member/contests` is deleted — this plan's content now fills the **Contests
& Campaigns** section of the quest hub built by
[Plan 07](07-member-onboarding.md), reached from the sidebar at
`/member/onboarding?section=contests`, where it sits **nested under
References**. (The 2026-07-24 revision made this a category *inside* the
Referensi tab; the 2026-07-26 menu rework promoted it to its own section
with References as its visual parent.) The dashboard-banner tie-in below is
unaffected.

## Goal

Content for the Contests & Campaigns section: merges *Contest & Reward* and
*Campaign* into one "what's happening now" view. This also feeds the
announcement banner on the Plan 06 dashboard (revisit that placeholder once
this lands).

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its sections rather than building its own page/route). Independent of Plans
08–11, 13–14.

## Source content

**Contest & Reward** (`/contest-reward`) and **Campaign** (`/campaign`):
neither was captured during exploration — **this plan's implementer must
visit both pages while logged in** to build the content inventory before
implementing.

## Scope

- `src/content/contests.ts` — typed structure: `{ title, description,
  imageUrl?, startDate?, endDate?, ctaLabel?, ctaUrl? }[]`, distinguishing
  ongoing contests/rewards from campaigns.
- Contests & Campaigns section: current/active
  items surfaced first, past items collapsed or filtered out (based on
  `endDate` if the source content has dates — confirm during content
  audit).
- Wire the most relevant active item into the Plan 06 dashboard's
  announcement banner (small follow-up edit to `MemberLayout`/dashboard) —
  unchanged by the route consolidation.

## Unit tests

- Content module schema validation.
- Only active (non-expired) items shown by default, matching a reference
  "current date" in the test.

## Verification

`npm run dev`, log in, open **Contests & Campaigns** from the sidebar, and
check `/member` (dashboard banner). `npm run lint`, `npx tsc --noEmit`,
`npm test`.
