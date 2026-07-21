# Plan 06 — Member space shell

## Status

**Done** in [PR #12](https://github.com/ogautama/connecteam-web/pull/12).
Shipped as described below. Notes on what the implementation settled that the
plan left open:

- **Role-aware nav** lives in `src/lib/member/nav.ts` as pure functions
  (`visibleNavItems`, `showsLeaderBadge`) so it's unit-testable away from the
  React tree. No section is `leaderOnly` today, as predicted; Events and
  Directory carry `leaderExtras` (they hold leader-only *items*, Plans 13/14)
  and the "Leaders" badge renders **for leaders only** — showing it to an
  agent would advertise content they can't open, which is worse than staying
  quiet about it.
- **`CurrentUser` gained `name`** (populated from Google's `full_name` by the
  `on_auth_user_created` trigger) — the dashboard greeting and account menu
  need it. Added `requireMember()` / `requireMemberTarget()` alongside the
  existing `requireRole` pair: same redirect logic minus the role check, for
  pages that just need *a* signed-in member.
- **The guard runs twice on purpose** — `proxy.ts` at the edge of the
  request, `src/app/member/layout.tsx` in the page. The layout is where the
  session's user comes from anyway, and a gate that lives only in the proxy
  is one `matcher` edit away from silently not running.
- **Copy is Bahasa, section names are English.** Same split the design spec
  and Plans 07–14 already assume: the eight section names are the IA and stay
  English (nav labels, page `<h1>`s, `<title>`s), everything descriptive —
  greeting, banner, card blurbs, placeholders, "Keluar" — is Bahasa in the
  same casual register as the public site. Role labels (Agent/Leader) stay
  English too, since that's what the network calls them.
- **Mobile nav is still the deferred gap** — the sidebar is `hidden md:block`
  (Plan 01), so on a phone the member nav is unreachable and only the
  dashboard's section cards get you around. Tracked in
  [00-overview.md](00-overview.md#known-deferred-issues); the design spec's
  drawer/tab-bar alternatives are the intended fix.

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

*(Done: the unauthenticated half was verified live against `npm run dev` —
all nine `/member/**` routes answer `307 → /login`, and they compile, so no
link 404s or 500s. The signed-in half below still needs a manual run with the
real Google test accounts.)*

- `npm run dev`, sign in with the test Google accounts seeded with
  `agent`/`leader` `PendingInvite`s (Plan 02b's seed script) in the browser
  pane; confirm both reach the dashboard, nav renders, logout works. Also
  confirm a Google account with **no** matching invite is rejected rather
  than reaching the dashboard.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
