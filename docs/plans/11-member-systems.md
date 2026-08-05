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

**Revised again 2026-07-29**: scope splits across two sections. See
[Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet).

- **PRUForce, Lisensi AAJI/AASI, and the MFC how-to guide move to
  Onboarding** (Plan 07 — `onboarding-pruforce`, `onboarding-lisensi`,
  `onboarding-mfc`), not References. The source content below (portal links,
  the MFC step-by-step, the iOS troubleshooting notes) is unchanged — only
  which section it renders under.
- **PRU PayLink and Claim/Bukti Claim stay under References**, but as flat
  items rather than one "Official Systems" category: `references-prupay-link`
  and `references-claim` (Claim's page now has 2 in-page sections — How to
  Claim, Bukti Claim — instead of being 2 separate sidebar entries).
- This plan's `src/content/systems.ts` module likely needs to split into an
  Onboarding-facing piece and a References-facing piece rather than staying
  one file — implementer's call based on how much the two halves end up
  sharing.

## Goal

Content for two sections: PRUForce, Lisensi AAJI/AASI, and the MFC guide now
live under Onboarding; PRU PayLink and Claim (with Bukti Claim as an
in-page section) stay under References. Original goal, unchanged in
substance: cover official Prudential systems and the processes around them.

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

> **Amended 2026-08-05** — both URLs verified live and, unlike the rest of
> this plan's sources, **publicly reachable without a login**. Two changes
> from the above, both settled while reviewing
> [spec-pruforce.html](../design/spec-pruforce.html):
>
> - **PruWorks moves to Yellow Pages** ([Plan 14](14-member-directory.md)),
>   along with the PRUForce Web Portal and the PRUDigitalfriend helpdesk. The
>   Onboarding step is only "get PRUForce onto your phone", so PRUForce's own
>   download page is the single link it carries.
> - **There is no app-store link, and the download files can't be linked
>   directly.** PRUForce is on neither Google Play nor the App Store in
>   Indonesia (the `vn.com.prudential.pruforce.dev` Play listing is Prudential
>   *Vietnam's*; `apps.apple.com/id/app/pruforce-mobile/id1082618139` 404s).
>   On the portal page itself, the Android button is a signed GCS URL that
>   expires in 7 days and the iOS button is an `itms-services://` enterprise
>   OTA manifest that only mobile Safari acts on — hence the iOS-popup
>   troubleshooting below, and hence: link the portal page, never the files.
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
