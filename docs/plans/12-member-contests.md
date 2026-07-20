# Plan 12 — Member: Contests & Campaigns

## Goal

`/member/contests` — merges *Contest & Reward* and *Campaign* into one
"what's happening now" hub. This also feeds the announcement banner on the
Plan 06 dashboard (revisit that placeholder once this lands).

## Depends on

Plan 06 (member shell/nav). Independent of Plans 07–11, 13–14.

## Source content

**Contest & Reward** (`/contest-reward`) and **Campaign** (`/campaign`):
neither was captured during exploration — **this plan's implementer must
visit both pages while logged in** to build the content inventory before
implementing.

## Scope

- `src/content/contests.ts` — typed structure: `{ title, description,
  imageUrl?, startDate?, endDate?, ctaLabel?, ctaUrl? }[]`, distinguishing
  ongoing contests/rewards from campaigns.
- `/member/contests` page: current/active items surfaced first, past items
  collapsed or filtered out (based on `endDate` if the source content has
  dates — confirm during content audit).
- Wire the most relevant active item into the Plan 06 dashboard's
  announcement banner (small follow-up edit to `MemberLayout`/dashboard).

## Unit tests

- Content module schema validation.
- Page: only active (non-expired) items shown by default, matching a
  reference "current date" in the test.

## Verification

`npm run dev`, log in, visit `/member/contests` and `/member` (dashboard
banner). `npm run lint`, `npx tsc --noEmit`, `npm test`.
