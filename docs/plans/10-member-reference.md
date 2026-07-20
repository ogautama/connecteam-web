# Plan 10 — Member: Reference Data

## Goal

`/member/reference` — merges *Tabel Premi*, *Tabel Medical*, and *Prestige*
into one organized reference-data section. Structuring these into real
queryable tables (vs. PDF/image downloads) is a stretch goal, not v1 — v1
just organizes and re-hosts what exists today.

## Depends on

Plan 06 (member shell/nav). Independent of Plans 07–09, 11–14.

## Source content (from sites.google.com/view/connecteam)

**Tabel Premi** (`/tabel-premi`): premium rate tables organized by K
(Konvensional) / S (Syariah), grouped by category (Kesehatan confirmed;
**re-visit the page to confirm remaining categories** — only partially
captured during exploration). Each row is a PDF, e.g. "PWM K/S Tanpa
OR.pdf".

**Tabel Medical** (`/tabel-medical`): not captured during exploration —
**this plan's implementer must visit this page while logged in** to build
the content inventory before implementing.

**Prestige** (`/prestige`): description of Prudential's High-Net-Worth
client program, references the Tabel Medical page for its Non-Medical
Limit table.

## Scope

- `src/content/reference.ts` — typed structure: `{ category, taxonomy: "K"
  | "S", label, fileUrl }[]` for premium tables, plus Tabel Medical entries
  once inventoried, plus the Prestige program description.
- `/member/reference` page: tabbed or sectioned layout (Premium Tables /
  Medical Tables / Prestige Program), premium tables filterable by
  category and K/S.
- Re-host PDFs under `public/downloads/` (source files from you, or Drive
  links as fallback).

## Unit tests

- Content module schema validation.
- Page: K/S and category filters narrow the visible table list correctly.

## Verification

`npm run dev`, log in, visit `/member/reference`, exercise filters, confirm
downloads work. `npm run lint`, `npx tsc --noEmit`, `npm test`.
