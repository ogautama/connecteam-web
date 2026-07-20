# Plan 06 — Member space shell

## Goal

Stand up the authenticated `/member` area: dashboard, sidebar nav grouped
into the 8 sections below, and real role gating — the frame that Plans 07–14
each plug a section into.

## Depends on

Plan 01 (layout), Plan 02 (auth + role middleware).

## Scope

- `/member` — dashboard: welcome message with the logged-in user's name,
  announcement/campaign banner (static content for now, real Contests &
  Campaigns data lands in Plan 12), quick links to each section, upcoming
  events preview (real data lands in Plan 13 — placeholder here).
- Sidebar nav in `MemberLayout` (extends Plan 01's shell) with the 8 section
  links: Get Started, Grow, Sell, Reference Data, Official Systems,
  Contests & Campaigns, Events, Directory. Nav items are role-aware: items
  with leader-only content show a "Leaders" badge and are hidden entirely
  for `agent` role where the whole section is leader-only (none currently
  are — gating happens at the item level within sections, per Plans 13/14).
- Logout action.
- Confirms `proxy.ts` (Next.js 16's `middleware.ts` equivalent) from Plan 02
  actually protects every `/member/**` route (this plan is what proves that
  end-to-end, since Plan 02 only unit tests the proxy logic in isolation).

## Out of scope

Actual section content — Plans 07–14 each own their own page under
`/member/<section>`, this plan only needs the nav links and placeholder/empty
pages to exist so links don't 404.

## Independence notes

Hard dependency on Plan 02 (needs a working `auth()`/session and seeded test
users) — this is the one plan in the tree that can't be meaningfully built or
tested against a stub, since its entire job is proving the gating works.

## Unit tests

- Unauthenticated visit to `/member` redirects to `/login`.
- Authenticated `agent` session sees the dashboard and all 8 nav links.
- Dashboard renders the logged-in user's name from the session.
- Logout clears the session and redirects to `/`.

## Verification

- `npm run dev`, log in as the seeded `agent` user and the seeded `leader`
  user (from Plan 02's seed script) in the browser pane; confirm both reach
  the dashboard, nav renders, logout works.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
