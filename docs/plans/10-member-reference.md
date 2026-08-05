# Plan 10 — Member: Reference Data (References section category)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route.
`/member/reference` is deleted — this plan's content now fills the
"Reference Data" category group within the **References** section of the
quest hub built by [Plan 07](07-member-onboarding.md), reached from the
sidebar at `/member/onboarding?section=references`. (The 2026-07-24 revision
called this the "Referensi tab"; the section was renamed **References** and
the in-page tab strip dropped on 2026-07-26 in favour of the sidebar.) That
section is shared with Plan 11's Official Systems content — exact grouping
is left open until both have real content, see Plan 07.

**Revised again 2026-07-29**: scope shrinks. Tabel Premi and Tabel Medical
**move to [Plan 09](09-member-sell.md)'s "Sales Tools" item** (part of the
Selling section now, not References) — see
[Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet).
This plan's remaining scope is just **Prestige**, which is now its own flat
References item (`references-prestige`) rather than a category heading —
References is no longer grouped into "Reference Data" / "Official Systems"
sub-headings, it's a flat list of 8 items (Plan 07's table). Prestige's
source content and the Non-Medical Limit cross-reference to Tabel Medical
below are otherwise unchanged.

## Goal

Content for a References-section category: merges *Tabel Premi*, *Tabel
Medical*, and *Prestige* into one organized reference-data group.
Structuring these into real queryable tables (vs. PDF/image downloads) is a
stretch goal, not v1 — v1 just organizes and re-hosts what exists today.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills part
of the References section rather than building its own page/route).
Independent of Plans 08–09, 11–14.

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
- References section, "Reference Data" category group: sectioned by sub-topic
  (Premium Tables / Medical Tables / Prestige Program), premium tables
  filterable by category and K/S, rendered via Plan 07's shared accordion
  component.
- Re-host PDFs under `public/downloads/` (source files from you, or Drive
  links as fallback).

## Unit tests

- Content module schema validation.
- K/S and category filters narrow the visible table list correctly.

## Verification

`npm run dev`, log in, open **References** from the sidebar, exercise the
Reference Data filters, confirm downloads work. `npm run lint`,
`npx tsc --noEmit`, `npm test`.
