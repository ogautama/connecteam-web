# Plan 06 — Member space shell

## Goal

Stand up the authenticated `/member` area: dashboard, sidebar nav grouped
into the 8 sections below, and real role gating — the frame that Plans 07–14
each plug a section into.

## Depends on

Plan 01 (layout), [Plan 02b](02b-supabase-auth-google-oauth.md) (auth + role
middleware).

*Updated 2026-07-21: gating and manual-verification details below assume
Plan 02b's Google OAuth + pending-invite model, not Plan 02's original
Credentials login — see [00-overview.md](00-overview.md#why-supabase--vercel-instead-of-neon--authjs).*

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
- Confirms `proxy.ts` (Next.js 16's `middleware.ts` equivalent) from
  Plan 02b actually protects every `/member/**` route — both unauthenticated
  requests and authenticated-but-no-profile ones (a Google account with no
  matching invite) — this plan is what proves that end-to-end, since
  Plan 02b only unit tests the proxy logic in isolation.

## Out of scope

Actual section content — Plans 07–14 each own their own page under
`/member/<section>`, this plan only needs the nav links and placeholder/empty
pages to exist so links don't 404.

## Independence notes

Hard dependency on Plan 02b (needs a working `getCurrentUser()`/session and
seeded fixture invites) — this is the one plan in the tree that can't be
meaningfully built or tested against a stub, since its entire job is proving
the gating works.

## Unit tests

- Unauthenticated visit to `/member` redirects to `/login`.
- Authenticated Google session with no matching profile is rejected from
  `/member` (Plan 02b's no-profile case, proven end-to-end here).
- Authenticated `agent` session sees the dashboard and all 8 nav links.
- Dashboard renders the logged-in user's name from the session.
- Logout clears the session and redirects to `/`.

## Verification

- `npm run dev`, sign in with the test Google accounts seeded with
  `agent`/`leader` `PendingInvite`s (Plan 02b's seed script) in the browser
  pane; confirm both reach the dashboard, nav renders, logout works. Also
  confirm a Google account with **no** matching invite is rejected rather
  than reaching the dashboard.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
