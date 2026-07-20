# Plan 14 — Member: Directory

## Goal

`/member/directory` — merges *Yellow Pages*, *CONNECT with Leaders*, *MRT
Group*, and *Prudential Indonesia* into one contacts directory, with
leader-only contact lines gated by role (same pattern as Plan 13).

## Depends on

Plan 06 (member shell/nav) — and Plan 02's `requireRole()` helper for
leader-only entries. Independent of Plans 07–13.

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
- `/member/directory` page: renders all entries for `leader` sessions;
  filters out `leaderOnly: true` entries for `agent` sessions server-side
  (same enforcement pattern as Plan 13, reuse the same role-filtering
  approach rather than reinventing it).

## Unit tests

- Content module schema validation.
- Page: `agent` session response excludes PRU Sales Friends and any other
  entries marked `leaderOnly`; `leader` session response includes them.

## Verification

`npm run dev`, log in as both seeded users, confirm the leader-only
contacts differ as expected. `npm run lint`, `npx tsc --noEmit`, `npm test`.
