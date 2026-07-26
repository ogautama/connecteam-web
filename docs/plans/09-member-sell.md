# Plan 09 — Member: Sell (sales kit + product catalog, quest hub section)

## Status

**Revised 2026-07-24, again 2026-07-26**: no longer its own route.
`/member/sell` is deleted — this plan's content now fills the **Selling**
section of the quest hub built by [Plan 07](07-member-onboarding.md),
reached from the sidebar at `/member/onboarding?section=selling`. (The
2026-07-24 revision called this a "tab"; the in-page tab strip was dropped
on 2026-07-26 in favour of the sidebar — same section, different switcher.)
This is still the largest content section by far (full product catalog +
sales kit); only its container changed, not its content scope below.

## Goal

Content for the Selling section of `/member/onboarding`: merges *Sales Kit*,
*Script Selling Online*, and *Product Training* into one
searchable/filterable product catalog instead of one giant scroll page.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its sections rather than building its own page/route). Independent of Plans
08, 10–14.

## Source content (from sites.google.com/view/connecteam)

**Sales Kit** (`/sales-kit`): Product Sales Kit.pdf (printable, for
client-facing use), Quotation (Drive folder, access-request gated —
`drive.google.com/drive/folders/1KkomrYUE43sSuQsJaebA0be7Gx28CzJ8`),
"Template VidCall Cekatan" Canva template, "Kelengkapan Data Calon
Client.xlsx", reference tables as images: Masa Tunggu Polis (policy waiting
period), Tabel Proporsi Klaim (claim proportion), List 60+1 Kondisi Kritis
(PCB88), List 61 Kondisi Kritis (PCA), Commission table.

**Script Selling Online** (`/sales-kit/script-selling-online`): not yet
captured in detail — **this plan's implementer should re-visit this page
first** to pull its content before building.

**Product Training** (`/product-training`): a long page (~19K chars of
accessibility tree, only partially captured during initial exploration) —
per-product entries, each with a YouTube training video, a "Highlight
Produk" bullet list, "Ketentuan" (terms: entry age, plan options, payment
requirements), and a commission table image. Confirmed products captured
so far: PRU Well (Kesehatan), PRU Sehat (Kesehatan), PRU Critical Amanah
(Kritis & Jiwa), PRU Critical Benefit 88 / PCB88 (Kritis & Jiwa) — **the
page continues beyond what was captured; re-visit
`sites.google.com/view/connecteam/product-training` while logged in and
scroll/read the full page before building the content module**, since this
plan needs the complete product list, not just the four above.

## Scope

- `src/content/products.ts` — typed product catalog: `{ id, name, category
  ("Kesehatan" | "Kritis & Jiwa" | ...), videoUrl, highlights: string[],
  terms: string[], commissionImageUrl }` for every product found on the
  Product Training page (full re-audit required, see above).
- `src/content/sales-kit.ts` — the Sales Kit resources (PDFs, Canva
  template, Quotation folder link, reference table images).
- Selling section: category filter/search over the product catalog, each
  product expandable (via Plan 07's shared accordion component) to show
  video + highlights + terms + commission; Sales Kit resources shown as a
  separate "Tools & Templates" group above or beside the catalog.
- Re-host downloadable PDFs/images under `public/downloads/` (source files
  from you, or Drive/original links as fallback).

## Unit tests

- Content module schema validation: every product has a non-empty
  category, at least one highlight, a valid video URL.
- Selling section: category filter narrows the visible product list correctly;
  search matches by product name.

## Verification

`npm run dev`, log in, open **Selling** from the sidebar,
filter by each category, expand a few products, confirm video/commission
content renders. `npm run lint`, `npx tsc --noEmit`, `npm test`.
