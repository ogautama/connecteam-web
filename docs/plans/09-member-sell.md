# Plan 09 — Member: Sell (sales kit + product catalog, quest hub tab)

## Status

**Revised 2026-07-24**: no longer its own route. `/member/sell` goes away —
this plan's content now fills the **Selling** tab (Level 3) of the quest hub
built by [Plan 07](07-member-onboarding.md). This is still the largest
content section by far (full product catalog + sales kit); only its
container changed, not its content scope below.

## Goal

Content for the Selling tab of `/member/onboarding`: merges *Sales Kit*,
*Script Selling Online*, and *Product Training* into one
searchable/filterable product catalog instead of one giant scroll page.

## Depends on

[Plan 07](07-member-onboarding.md) (quest hub shell — this plan fills one of
its tabs rather than building its own page/route). Independent of Plans
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
- Selling tab: category filter/search over the product catalog, each
  product expandable (via Plan 07's shared accordion component) to show
  video + highlights + terms + commission; Sales Kit resources shown as a
  separate "Tools & Templates" group above or beside the catalog.
- Re-host downloadable PDFs/images under `public/downloads/` (source files
  from you, or Drive/original links as fallback).

## Unit tests

- Content module schema validation: every product has a non-empty
  category, at least one highlight, a valid video URL.
- Selling tab: category filter narrows the visible product list correctly;
  search matches by product name.

## Verification

`npm run dev`, log in, visit `/member/onboarding`, open the Selling tab,
filter by each category, expand a few products, confirm video/commission
content renders. `npm run lint`, `npx tsc --noEmit`, `npm test`.
