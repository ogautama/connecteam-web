# Plan 12 — Member: Contests & Campaigns (Referensi tab category)

## Status

**Revised 2026-07-24**: no longer its own route. `/member/contests` goes
away — this plan's content now fills a category group ("Contests &
Campaigns") within the **Referensi** tab of the quest hub built by
[Plan 07](07-member-onboarding.md). Exact grouping alongside Plans 10–11, 13's
categories is left open until all four have real content — see Plan 07. The
dashboard-banner tie-in below is unaffected by the route change.

## Goal

Content for a Referensi-tab category: merges *Contest & Reward* and
*Campaign* into one "what's happening now" group. This also feeds the
announcement banner on the Plan 06 dashboard (revisit that placeholder once
this lands).

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills part
of the Referensi tab rather than building its own page/route). Independent
of Plans 08–11, 13–14.

## Source content

**Contest & Reward** (`/contest-reward`) and **Campaign** (`/campaign`):
neither was captured during exploration — **this plan's implementer must
visit both pages while logged in** to build the content inventory before
implementing.

## Scope

- `src/content/contests.ts` — typed structure: `{ title, description,
  imageUrl?, startDate?, endDate?, ctaLabel?, ctaUrl? }[]`, distinguishing
  ongoing contests/rewards from campaigns.
- Referensi tab, "Contests & Campaigns" category group: current/active
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

`npm run dev`, log in, visit `/member/onboarding` (Referensi tab) and
`/member` (dashboard banner). `npm run lint`, `npx tsc --noEmit`,
`npm test`.
