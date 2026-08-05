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

**Revised again 2026-07-29**: scope grows on both sides. See
[Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet)
for the authoritative item list.

- Selling itself gets 3 named children instead of one undivided catalog:
  **Learning Center** (5 video sections: Segitiga kebutuhan (Basic), Kenalan
  3 Produk Dasar, Product Details, Teknik Closing, Handling Obj Selling —
  likely the Product Training videos below, re-cut into named sections
  rather than a flat per-product list), **Bank nama rekrut + FORM** (check
  against Plan 08's original FORM.pdf before treating as new content), and
  **Sales Tools** (7 sections: Tabel Premi, Tabel Medical, Tabel TB & BB,
  Template Screenshot Video Call, Script siap pakai untuk d share, Product
  Sales Kit, Review Polis — the first two, **Tabel Premi and Tabel Medical,
  move here from [Plan 10](10-member-reference.md)**, whose own scope is
  reduced accordingly; the rest were already this plan's Sales Kit content).
- This plan also now owns two new References items: **Recording** (2
  sections — Sharing n Motivation, Product Details — video links) and
  **Commission** (the Commission table already listed below, now surfaced
  as its own References item instead of just a Sales Kit image).
- **Recording's "Product Details" section and Learning Center's "Product
  Details" section are the same page, shown in two places** — confirmed by
  the person who owns this content. Don't build two copies; see
  [Plan 18](18-content-admin.md) for the shared-content mechanism this is
  meant to use once it ships. Until then, the two nav positions can point at
  the same static content-module entry as a stopgap.

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
