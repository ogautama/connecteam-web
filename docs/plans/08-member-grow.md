# Plan 08 — Member: Grow (recruiting content, quest hub tab)

## Status

**Revised 2026-07-24**: no longer its own route. `/member/grow` goes away —
this plan's content now fills the **Recruiting** tab (Level 2) of the quest
hub built by [Plan 07](07-member-onboarding.md). Source content and PDF
inventory below are unchanged; only "Scope" changed, from "build a page" to
"fill a tab."

## Goal

Content for the Recruiting tab of `/member/onboarding`: tools for recruiting
new partners into the business — same material the old *Recruitment Kit*
page had, just a different container.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its tabs rather than building its own page/route). Independent of Plans
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
- Fills the Recruiting tab's accordion groups: "Assess" (FAST, FORM, Market
  Survey), "Pitch" (BOSS/BOP), "Order materials" (CONNECT Card), plus the
  CONNECT NOW lead link.
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

`npm run dev`, log in, visit `/member/onboarding`, open the Recruiting tab,
click through each resource. `npm run lint`, `npx tsc --noEmit`, `npm test`.
