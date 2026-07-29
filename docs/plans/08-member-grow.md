# Plan 08 — Member: Grow (recruiting content, quest hub section)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route.
`/member/grow` is deleted — this plan's content now fills the **Recruiting**
section of the quest hub built by [Plan 07](07-member-onboarding.md),
reached from the sidebar at `/member/onboarding?section=recruiting`. (The
2026-07-24 revision called this a "tab"; the in-page tab strip was dropped
on 2026-07-26 in favour of the sidebar — same section, different switcher.)
Source content and PDF inventory below are unchanged; only "Scope" changed,
from "build a page" to "fill a section."

**Revised again 2026-07-29**: the Recruiting section now has 4 named
sub-items instead of one flat resource list — see
[Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet).
The item names come from a content-inventory sheet, not this plan's original
page audit, so map them against the resources below rather than assuming a
1:1 match — likely correspondences (unconfirmed): "Kenapa recruit dlu?"
(Earned Income/AP/AAB/AB, per a Google Sheet formula from Robert) probably
isn't any of the 4 PDFs below and may be new; "Bank nama rekrut + FAST"
likely reuses FAST.pdf; "Presentasi bisnis ke calon rekrut" (a Canva link)
likely reuses BOSS/BOP; "Handling Obj calon rekrut" has no format decided
yet per the sheet's own notes ("Bentuknya apa?") and may be new content, not
a re-hosted PDF. FORM.pdf and Market Survey don't obviously map to any of
the 4 new items — check whether they're now covered elsewhere (Selling's
"Bank nama rekrut + FORM", Plan 09) before assuming they're dropped.

## Goal

Content for the Recruiting section of `/member/onboarding`: tools for
recruiting new partners into the business — same material the old
*Recruitment Kit* page had, just a different container.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its sections rather than building its own page/route). Independent of Plans
09–14.

## Source content (from sites.google.com/view/connecteam/recruitment-kit)

- "CONNECT NOW" lead-capture link (`bit.ly/CONNECTeamData`).
- FAST (C) — candidate assessment method — `FAST.pdf`.
- FORM (C) — `FORM.pdf`.
- Market Survey (D) — "Survei Karir & Gaya Hidup.pdf".
- BOSS (D) — business opportunity presentation — "BOP Connecteam 26.pdf".
- CONNECT Card ordering via WhatsApp
  (`wa.me/628113535888?text=Mau Order CONNECT Cards nya 1 dong`).

## Scope

- `src/content/grow.ts` — typed list of the above resources (PDF downloads,
  external links, WA order link), each with a stable `itemId` for Plan 07's
  shared accordion component.
- Fills the Recruiting section's accordion groups: "Assess" (FAST, FORM,
  Market Survey), "Pitch" (BOSS/BOP), "Order materials" (CONNECT Card), plus
  the CONNECT NOW lead link — replacing that section's placeholder entry in
  `QuestHub.tsx`'s `SECTIONS` map.
- Re-host the 4 PDFs under `public/downloads/` (source files from you, or
  Drive links as fallback).

**Not in this plan's scope**: the reference prototype behind the quest-hub
redesign also showed a recruit-tracking mini-CRM alongside this static
content — add candidate names, score them Hot/Warm/Cold via the FAST
framework, export to CSV. That's new interactive functionality with its own
data-model needs, not "content to source," and isn't covered here — tracked
as a deferred item in
[00-overview.md](00-overview.md#known-deferred-issues).

## Unit tests

- Content module schema validation (same pattern as before).
- Covered by Plan 07's shared accordion component test plus this module's
  own schema test — no separate page to test.

## Verification

`npm run dev`, log in, open **Recruiting** from the sidebar,
click through each resource. `npm run lint`, `npx tsc --noEmit`, `npm test`.
