# Plan 13 — Member: Events

## Goal

`/member/events` — rebuild of *Support System* as a real events
list/calendar. This is the section that most directly exercises role
gating: "Power Monday" is confirmed **leader-only** in the source content
and must be hidden from `agent` sessions, not just labeled.

## Depends on

Plan 06 (member shell/nav) — and specifically
[Plan 02b](02b-supabase-auth-google-oauth.md)'s `requireRole()` helper
for the leader-only item (`requireRole` itself is unaffected by the
Supabase/auth rework, only the doc pointer moved from Plan 02, superseded).
Independent of Plans 07–12, 14.

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
- `/member/events` page: renders all events for `leader` sessions; filters
  out `leaderOnly: true` events for `agent` sessions using Plan 02b's role
  helper (server-side, not just CSS-hidden — an agent should not receive
  Power Monday's details in the page payload at all).

## Unit tests

- Content module schema validation.
- Page (server component/route test): `agent` session response excludes
  the Power Monday event entirely; `leader` session response includes it.

## Verification

`npm run dev`, log in as the seeded `agent` user — confirm Power Monday is
absent; log in as the seeded `leader` user — confirm it's present. `npm run
lint`, `npx tsc --noEmit`, `npm test`.
