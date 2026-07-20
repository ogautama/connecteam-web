# PR-08 — Member: Grow (recruitment kit)

## Goal

`/member/grow` — rebuild of the current *Recruitment Kit* page: tools for
recruiting new partners into the business.

## Depends on

PR-06 (member shell/nav). Independent of PRs 07, 09–14.

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
  external links, WA order link).
- `/member/grow` page rendering the resource list grouped as "Assess" (FAST,
  FORM, Market Survey), "Pitch" (BOSS/BOP), "Order materials" (CONNECT
  Card), and the CONNECT NOW lead link.
- Re-host the 4 PDFs under `public/downloads/` (source files from you, or
  Drive links as fallback).

## Unit tests

- Content module schema validation (same pattern as PR-07).
- Page renders all resource groups and the WA order link with correctly
  encoded query text.

## Verification

`npm run dev`, log in, visit `/member/grow`, click through each resource.
`npm run lint`, `npx tsc --noEmit`, `npm test`.
