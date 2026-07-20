# PR-11 — Member: Official Systems

## Goal

`/member/systems` — merges *PRUForce*, *Lisensi AAJI/AASI*, *PRU PayLink*,
*Claim*, and *Bukti Claim* into one hub for official Prudential systems and
the processes around them.

## Depends on

PR-06 (member shell/nav). Independent of PRs 07–10, 12–14.

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
not captured during exploration — **this PR's implementer must visit each
of these four pages while logged in** to build the content inventory
before implementing.

## Scope

- `src/content/systems.ts` — typed structure per sub-topic: external portal
  links, step-by-step how-to guides (ordered list), any PDFs/images.
- `/member/systems` page: sectioned by sub-topic (Portals, Licensing,
  PayLink, Claims Process, Claim Proof), each section collapsible.
- Re-host any downloadable assets under `public/downloads/`.

## Unit tests

- Content module schema validation.
- Page renders all 5 sub-sections; external portal links point to the
  correct Prudential URLs.

## Verification

`npm run dev`, log in, visit `/member/systems`, confirm all sub-sections
and links render. `npm run lint`, `npx tsc --noEmit`, `npm test`.
