# Plan 05b — Calculator page, nav entry, and quote form

## Status

**Proposed (2026-08-08)**, not yet built. Second of three sub-plans
replacing [Plan 05](05-calculator-tool.md)'s original scope — see
[Plan 05a](05a-premium-engine-integration.md) for the full pivot rationale
and what `premium-engine` provides.

## Depends on

[Plan 05a](05a-premium-engine-integration.md) (the pricing Server Action).

## Goal

A real `/member/calculator` page: a product-driven form (works for
whatever's in `premium-engine`'s `PRODUCTS` registry — today just
`life_PHE` and `critical_PCA`) that prices on an explicit "Hitung" submit.
Replaces the "Segera hadir" hub placeholder that's sat in the quest hub
sidebar since Plan 07 with the actual tool.

**Pricing is submit-triggered, not as-you-type — decided here, 2026-08-08,
so it isn't relitigated in review.** Rates are server-only by design (the
package's iron rule), so *every* price is a Server Action round trip — and
this deployment has a known latency footgun: Vercel functions defaulted to
`iad1` while users (and Supabase) are in the Singapore region. Debounced
price-as-you-type would make that lag a constant presence in the form;
price-on-submit makes it a single wait the agent expects. Changing an
input after a result is shown should visibly mark the shown price as stale
(disable/dim it) until the next submit, so an agent never reads an old
premium against new inputs.

## Scope

- **Nav** (`src/lib/member/nav.ts`): Calculator moves from a hub `section`
  (rendered inside `/member/onboarding?section=calculator` as a
  placeholder) to a real top-level route entry — `{ label: "Calculator",
  href: "/member/calculator", description: "..." }` — in the same
  top-level sidebar position it holds today (between Selling and
  References). This mirrors `Leads`/`Add Member` below it, which are
  already "real route, not a hub section" for the same reason: an
  interactive tool, not a content page. Concretely:
  - Drop `"calculator"` from the `HubSectionId` union and change
    `MEMBER_NAV`'s Calculator entry from `section` to `href`.
  - `memberSections()`'s explicit `item.section !== "calculator"`
    exclusion (and its comment) goes stale once Calculator has no
    `section` at all — simplify back to the plain `item.section !==
    undefined` filter.
  - No dashboard quick-link card for it, consistent with `Leads`/`Add
    Member` not getting one either — `memberSections()` only surfaces
    `section`-based items, by design.
  - Remove the placeholder branch in `/member/onboarding` that rendered
    "Segera hadir" for the `calculator` section, and drop `"calculator"`
    from wherever `HUB_SECTIONS`/content-lookup expects every
    `HubSectionId` to have a renderer.
- **`/member/calculator/page.tsx`** — gated the same way the rest of
  `/member/**` already is (existing proxy/auth check), renders the form.
- **Form**, built only against `premium-engine`'s `/public` entry:
  - Product picker sourced from `Object.values(PRODUCTS)` — display name,
    not a hardcoded list of two.
  - Per-product fields driven by the selected `ProductDefinition`'s bounds/
    plans/`sumAssuredOptions` (age bounds, gender, smoking status, sum
    assured, plan) — the form must not know product-specific field logic
    beyond what the registry describes, since that's what lets a third
    product show up later without a UI change.
  - Client-side validation via `makePremiumInputSchema(product)`.
  - On submit with valid input, calls 05a's pricing action and shows the
    priced annual/monthly premium (see the submit-triggered decision under
    Goal); a validation error renders inline instead of calling the action
    (mirrors `handlePremiumRequest`'s own `422` shape for anything that
    slips past client-side validation, e.g. a stale cached bound). Editing
    any input after a result is shown marks that result stale until the
    next submit.
- Styling matches the existing `/member` shell (its Tailwind tokens), not
  `MarketingLayout` — this page never renders for a logged-out visitor.

## Out of scope

- Saving a result against a named client, PDF generation (05c) — this page
  is "get a price," full stop.
- Products beyond `life_PHE`/`critical_PCA` (blocked on `premium-engine`
  itself, not this repo).

## Unit tests

- `nav.ts`: `navItemHref` resolves Calculator to `/member/calculator`;
  `isValidSection("calculator")` returns `false`; `memberSections()` still
  excludes Calculator (now implicitly, via its `href`-only shape) the same
  way it already excludes Leads/Add Member.
- Form component: renders one option per `PRODUCTS` entry; selecting a
  product swaps in that product's fields/bounds; a valid submission shows a
  priced result; an invalid submission (e.g. DOB outside bounds) shows a
  validation message and does **not** call the pricing action (mock it and
  assert it was never called); editing an input after a result is shown
  marks the result stale.

## Verification

- `npm run dev`, exercise `/member/calculator` in the browser pane signed
  in as a test member: pick each of the two shipped products, submit a
  valid input for each and confirm a priced result renders, edit an input
  and confirm the shown price is marked stale until the next submit, then
  submit an out-of-range input and confirm a validation message instead of
  a price.
- Confirm the old hub placeholder is gone from `/member/onboarding` and the
  sidebar's Calculator entry navigates straight to the new route.
- Visit `/member/onboarding?section=calculator` directly — the sidebar has
  advertised that URL since Plan 07, so bookmarks/history may still carry
  it. Once `"calculator"` leaves `HubSectionId`, `isValidSection` returns
  false for it; confirm the hub's invalid-section fallback lands on the
  default section gracefully (no error page). A redirect isn't warranted —
  just verify the fallback behaves.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
