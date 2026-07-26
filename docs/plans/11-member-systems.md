# Plan 11 — Member: Official Systems (References section category)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route, and no
longer its own nav item. `/member/systems` is deleted and "Official Systems"
was **folded into References** in the 2026-07-26 menu rework — it's now a
category group inside the **References** section of the quest hub built by
[Plan 07](07-member-onboarding.md), reached from the sidebar at
`/member/onboarding?section=references`. That section is shared with Plan
10's Reference Data content; exact grouping is left open until both have
real content, see Plan 07.

## Goal

Content for a References-section category: merges *PRUForce*, *Lisensi
AAJI/AASI*, *PRU PayLink*, *Claim*, and *Bukti Claim* into one group for
official Prudential systems and the processes around them.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills part
of the References section rather than building its own page/route).
Independent of Plans 08–10, 12–14.

## Source content (from sites.google.com/view/connecteam)

**PRUForce** (`/pruforce`): links to the official Prudential agent portals
— PruForce 2.0
(`portals.prudential.co.id/agent/application/view/68105c1e152990ce5bc2e7a6`)
and PruWorks
(`portals.prudential.co.id/agent/application/view/682dad51152990ce5bc7615c`).
Also a large how-to section (~29K chars of accessibility tree, only
partially captured): iOS popup troubleshooting steps, "Cara Mengikuti Kelas
My First Case (MFC)" step-by-step guide (log into PruForce → Training menu
→ ...). **Re-visit this page while logged in to capture the full how-to
content** before building — it continues well past what was captured here.

**Lisensi AAJI/AASI** (`/lisensi-aaji-aasi`), **PRU PayLink**
(`/pru-paylink`), **Claim** (`/claim`), **Bukti Claim** (`/bukti-claim`):
not captured during exploration — **this plan's implementer must visit each
of these four pages while logged in** to build the content inventory
before implementing.

## Scope

- `src/content/systems.ts` — typed structure per sub-topic: external portal
  links, step-by-step how-to guides (ordered list), any PDFs/images.
- References section, "Official Systems" category group: sectioned by sub-topic
  (Portals, Licensing, PayLink, Claims Process, Claim Proof), each section
  collapsible via Plan 07's shared accordion component.
- Re-host any downloadable assets under `public/downloads/`.

## Unit tests

- Content module schema validation.
- Renders all 5 sub-sections; external portal links point to the correct
  Prudential URLs.

## Verification

`npm run dev`, log in, open **References** from the sidebar, confirm the
Official Systems sub-sections and links render. `npm run lint`,
`npx tsc --noEmit`, `npm test`.
