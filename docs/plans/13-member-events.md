# Plan 13 — Member: Events (Referensi tab category)

## Status

**Revised 2026-07-24**: no longer its own route. `/member/events` goes away
— this plan's content now fills a category group ("Events") within the
**Referensi** tab of the quest hub built by
[Plan 07](07-member-onboarding.md). Exact grouping alongside Plans 10–12's
categories is left open until all four have real content — see Plan 07.
**The leader-only filtering requirement below is unchanged and still
critical**: moving into a shared accordion component doesn't relax it — an
`agent` session's page payload must still exclude Power Monday entirely,
not just hide it with CSS, regardless of which tab renders it.

## Goal

Content for a Referensi-tab category: rebuild of *Support System* as a real
events list. This is the section that most directly exercises role gating:
"Power Monday" is confirmed **leader-only** in the source content and must
be hidden from `agent` sessions, not just labeled.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills part
of the Referensi tab rather than building its own page/route) — and
specifically [Plan 02b](02b-supabase-auth-google-oauth.md)'s
`requireRole()` helper for the leader-only item. Independent of Plans
08–12, 14.

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
  schedule, leaderOnly: boolean, registerUrl? }[]`.
- Referensi tab, "Events" category group: renders all events for `leader`
  sessions; filters out `leaderOnly: true` events for `agent` sessions
  using Plan 02b's role helper (server-side, not just CSS-hidden — an agent
  should not receive Power Monday's details in the page payload at all,
  even though it now shares a page with other tabs' content).

## Unit tests

- Content module schema validation.
- Server-side render test: `agent` session response excludes the Power
  Monday event entirely; `leader` session response includes it.

## Verification

`npm run dev`, log in as the seeded `agent` user, open `/member/onboarding`
→ Referensi tab — confirm Power Monday is absent; log in as the seeded
`leader` user — confirm it's present. `npm run lint`, `npx tsc --noEmit`,
`npm test`.
