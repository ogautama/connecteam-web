# Plan 14 — Member: Directory (quest hub section)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route.
`/member/directory` is deleted — this plan's content now fills the
**Directory** section of the quest hub built by
[Plan 07](07-member-onboarding.md), reached from the sidebar at
`/member/onboarding?section=directory`. (The 2026-07-24 revision called this
the "Kontak tab"; the 2026-07-26 menu rework renamed it **Directory** — the
menu keeps English section names, Bahasa for descriptive copy, per Plan
06 — and dropped the in-page tab strip in favour of the sidebar.)

**The leader-only filtering requirement below is unchanged and still
critical**, same as Plan 13's note — an `agent` session's page payload must
still exclude leader-only entries entirely, not just hide them with CSS.

## Goal

Content for the Directory section of `/member/onboarding`: merges *Yellow
Pages*, *CONNECT with Leaders*, *MRT Group*, and *Prudential Indonesia* into
one contacts directory, with leader-only contact lines gated by role (same
pattern as Plan 13).

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its sections rather than building its own page/route) — and
[Plan 02b](02b-supabase-auth-google-oauth.md)'s `requireRole()` helper for
leader-only entries. Independent of Plans 08–13.

## Source content (from sites.google.com/view/connecteam/yellow-pages)

- PRU Sales Friends — **(Leaders Only)** — WA link (`wa.me/628111685855`).
- PRU Digital Friends — WA link (`wa.me/628111566512`), not marked
  leader-only.
- PRU Medical Network — (Cashless Only) — a usage-condition label, not a
  role restriction; treat as informational, not gated.
- Page continues beyond what was captured (10409 chars total, ~4500
  captured) — **re-visit this page while logged in to capture the rest of
  the contact list** before implementing.

**CONNECT with Leaders** (`/connect-with-leaders`), **MRT Group**
(`/mrt-group`), **Prudential Indonesia** (`/prudential-indonesia`): not
captured during exploration — **this plan's implementer must visit all three
pages while logged in** to build the content inventory before implementing.

## Scope

- `src/content/directory.ts` — typed structure: `{ name, description?,
  contactUrl, leaderOnly: boolean }[]`, grouped by source category (Internal
  Support, Leaders, Company Info).
- Directory section: renders all entries for `leader` sessions; filters out
  `leaderOnly: true` entries for `agent` sessions server-side (same
  enforcement pattern as Plan 13, reuse the same role-filtering approach
  rather than reinventing it).

## Unit tests

- Content module schema validation.
- Server-side render test: `agent` session response excludes PRU Sales
  Friends and any other entries marked `leaderOnly`; `leader` session
  response includes them.

## Verification

`npm run dev`, log in as both seeded users, open **Directory** from the
sidebar, confirm the leader-only contacts differ as expected (check the page
source, not just the rendered output). `npm run lint`, `npx tsc --noEmit`,
`npm test`.
