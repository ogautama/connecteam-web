# Plan 10 — Member: Reference Data (Referensi tab category)

## Status

**Revised 2026-07-24**: no longer its own route. `/member/reference` goes
away — this plan's content now fills a category group ("Reference Data")
within the **Referensi** tab of the quest hub built by
[Plan 07](07-member-onboarding.md). Exact grouping alongside Plans 11–13's
categories is left open until all four have real content — see Plan 07.

## Goal

Content for a Referensi-tab category: merges *Tabel Premi*, *Tabel Medical*,
and *Prestige* into one organized reference-data group. Structuring these
into real queryable tables (vs. PDF/image downloads) is a stretch goal, not
v1 — v1 just organizes and re-hosts what exists today.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills part
of the Referensi tab rather than building its own page/route). Independent
of Plans 08–09, 11–14.

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
- Referensi tab, "Reference Data" category group: sectioned by sub-topic
  (Premium Tables / Medical Tables / Prestige Program), premium tables
  filterable by category and K/S, rendered via Plan 07's shared accordion
  component.
- Re-host PDFs under `public/downloads/` (source files from you, or Drive
  links as fallback).

## Unit tests

- Content module schema validation.
- K/S and category filters narrow the visible table list correctly.

## Verification

`npm run dev`, log in, visit `/member/onboarding`, open the Referensi tab,
exercise the Reference Data filters, confirm downloads work. `npm run
lint`, `npx tsc --noEmit`, `npm test`.
