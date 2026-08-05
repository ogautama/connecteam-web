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

**Reversed 2026-07-29 — read this before the section below.** Same reversal
as [Plan 13](13-member-events.md): as part of the 2026-07-29 menu
restructure, the only role-gated item anywhere in the member nav is now Add
Member. Directory (still `directory`, unnested — see
[Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet))
is open to every agent, including PRU Sales Friends. `leaderOnly` filtering
is no longer part of this plan's scope.

**Item list also changed.** The sheet gives Directory 4 children: Yellow
Pages, Who is Prudential, Who is MRT Group, Who is Connecteam. "Prudential
Indonesia" and "MRT Group" below map cleanly to the last two. "Who is
Connecteam" has no obvious match in the source content below — the old
scope's "CONNECT with Leaders" isn't mentioned in the sheet at all. Confirm
with the content owner whether it's dropped, renamed, or something new
before assuming either.

## Goal

Content for the Directory section of `/member/onboarding`: Yellow Pages, Who
is Prudential (was "Prudential Indonesia"), Who is MRT Group, and Who is
Connecteam (mapping to the old "CONNECT with Leaders" unconfirmed — see
above) as four separate items, no role gating.

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

**Routed here from the PRUForce step, 2026-08-05** (user's call while
reviewing [spec-pruforce.html](../design/spec-pruforce.html) — the Onboarding
step keeps only "how do I get the app installed", everything directory-shaped
comes here):

- **PRU Digital Friends** — same entry as above, now with the rest of its
  details confirmed from the PRUForce web portal footer: WhatsApp
  +62-811-1566-512 (**ketik: DF**), `prudigitalfriend@prudential.co.id`, and
  its actual remit is *"Kendala Aplikasi Digital"* — PRUForce, PRUFast, PULSE,
  and PRUWorks. The same footer also names two siblings worth capturing when
  the gated page is re-visited: **Agency Admin Helpdesk** (+62-811-1566-512,
  ketik: DA, `agencyadmin.helpdesk@prudential.co.id`) and **Agency License
  Helpdesk** (`agencylicense.helpdesk@prudential.co.id`).
- **PRUForce Web Portal** — `https://pruforce.prudential.co.id/pruforce-web`,
  production reports in a browser, login with a PRUForce ID.
- **PRUWorks** — `https://portals.prudential.co.id/agent/application/view/682dad51152990ce5bc7615c`
  (verified 2026-08-05). Moved out of Plan 11's PRUForce scope.

**CONNECT with Leaders** (`/connect-with-leaders`), **MRT Group**
(`/mrt-group`), **Prudential Indonesia** (`/prudential-indonesia`): not
captured during exploration — **this plan's implementer must visit all three
pages while logged in** to build the content inventory before implementing.

## Scope

- `src/content/directory.ts` — typed structure: `{ name, description?,
  contactUrl }[]`, one entry per Directory child item (Yellow Pages, Who is
  Prudential, Who is MRT Group, Who is Connecteam). **No `leaderOnly`
  field** — see the reversal above.
- Directory section: renders every entry to every session. No role
  filtering.

## Unit tests

- Content module schema validation.

## Verification

`npm run dev`, log in, open **Directory** from the sidebar, confirm all four
items render for both the seeded `agent` and `leader` users. `npm run lint`,
`npx tsc --noEmit`, `npm test`.
