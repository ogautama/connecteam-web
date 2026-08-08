# Plan 05c — Client quote capture and branded PDF

## Status

**Proposed (2026-08-08)**, not yet built. Third of three sub-plans
replacing [Plan 05](05-calculator-tool.md)'s original scope — see
[Plan 05a](05a-premium-engine-integration.md) for the full pivot rationale
and what `premium-engine` provides.

## Depends on

[Plan 05b](05b-premium-calculator-ui.md) (the priced quote form).

## Goal

Turn a priced result into something an agent can actually hand a client:
save it as a `Lead` (so it shows up on `/member/leads` the way DISC results
already do) and generate a CONNECTeam-branded PDF quotation to download.

## Scope

- **Client-quote form step**: once 05b shows a live price, an "Simpan &
  buat quotation" step collects the client's name + phone/email (mirrors
  `saveDiscLead`'s name/contact pattern in
  `src/app/tools/disc/actions.ts`), plus whatever `makeQuoteInputSchema`
  requires beyond the pricing-only schema.
- **`src/lib/premium/quote.ts`** — a `"use server"` action:
  - Requires `getCurrentUser()`. Every quote is self-owned (`ownerId =
    currentUser.id`) — no referral/`resolveRecruiter` logic like DISC has,
    since this is never reached anonymously.
  - Calls `/server`'s `handleQuoteRequest`; on success, maps the returned
    `LeadRecord` onto `createLead({ source: "calculator", name, contact:
    phone ?? email, inputs: {...request}, result: {...LeadRecord}, ownerId
    })` (`src/lib/leads.ts`, unchanged).
  - A honeypot-triggering submission (if the schema keeps that field) must
    **not** create a `Lead` row — same guard `handleQuoteRequest` already
    applies server-side; this action just needs to respect the `lead`
    field being absent on that path.
- **`/member/leads` source-aware rendering — this plan owns it.** The
  leads page is *not* source-agnostic today, in two ways that both bite
  (verified 2026-08-08 against the shipped Plan 16 code):
  - The list (`src/app/member/leads/page.tsx`) hard-fetches
    `getLeadsForViewer(user.id, "disc")` and renders a DISC-specific
    "Profil" column from `lead.result as DiscResult` — calculator leads
    would simply never appear.
  - The detail page (`[id]/page.tsx`) casts `lead.result as DiscResult`
    and `lead.inputs as { answers: DiscTrait[] }` unconditionally, and
    `getLeadForViewer` doesn't filter by source — so a calculator lead's
    id *is* reachable and would render garbage or crash on
    `DISC_PROFILES[undefined]`.
  Scope: the list gains a source switcher (two tabs, DISC / Calculator,
  DISC remaining the default so existing behaviour is unchanged) with
  per-source columns — the Calculator view shows product, plan, sum
  assured, and premium in place of "Profil"; the detail page branches on
  `lead.source`, keeping the existing DISC layout untouched and adding a
  calculator layout (client name/contact, product + plan, sum assured,
  premium breakdown, quoting agent, date — and a "download PDF again"
  button wired to `pdf.ts`, regenerating from the stored `inputs`). The
  page intro copy ("Hasil tes DISC dari link referral kamu…") and the
  `Leads` nav description in `src/lib/member/nav.ts` both get updated to
  stop implying DISC-only.
- **`src/lib/premium/theme.ts`** — a `PdfTheme` built from this repo's
  existing brand tokens (`src/app/globals.css`) rather than new hex values
  invented for the occasion. Concrete starting mapping for whoever
  implements this:
  - `brandName`: `"CONNECTeam"`.
  - `logo`: `public/logo/connecteam-wordmark.png` re-encoded as a base64
    `data:image/png;base64,...` URI.
  - `colors.brand`: `--color-brand-navy-700` (`#183f87`).
  - `colors.protection`: `--color-brand-navy-700` (or `-800` if it reads
    too close to `brand`).
  - `colors.payment`: `--color-brand-yellow-500` (`#dda701`) — the third
    brand hue (navy/red/gold) already used for the quest-hub theming.
  - `colors.tint`: `--color-brand-navy-50` (`#f3f5f9`).
  - `colors.benefitRamp`: six steps up the navy scale, e.g. `navy-100`
    through `navy-600`.
  - `colors.rampDark` / `rampLight` / `rampLightText`: `navy-700` /
    `navy-200` / `navy-900` respectively.
  This is a starting point to sanity-check against a rendered PDF, not a
  final call — adjust for contrast/legibility once a real document renders.
  Flag explicitly for whoever builds this: `PdfTheme`'s neutral/semantic
  colors (warning red, benefit-ramp contrast baseline) are **not**
  themeable by design (package README §5) — don't try to override those.
- **`src/lib/premium/pdf.ts`** — a `"use server"` action:
  - Recomputes the price server-side rather than trusting a client-
    submitted number (same discipline as the package's own
    `examples/vercel/premium-pdf.ts`).
  - Pulls agent identity from the signed-in member's `MemberIntake`
    (`fullName`, `activePhone`) rather than having the agent type it in
    per quote.
  - Builds `QuotationPdfData`, calls `renderQuotationPdf` with
    `theme.ts`'s theme, and returns the PDF bytes (base64) for a
    client-side `Blob` download.
  - Note the alternative for whoever implements this: a Route Handler
    instead of a Server Action, if base64-over-a-Server-Action turns out
    to hit a payload-size or ergonomics wall — this repo has exactly one
    existing Route Handler precedent (`src/app/auth/callback/route.ts`),
    so it wouldn't be unprecedented, just less consistent with how every
    other form-submit flow here works. Decide during implementation, not
    in this doc.
- **`vercel.json`**: add the `includeFiles` rule `premium-engine`'s README
  calls out by name ("A specific deployment trap worth calling out by
  name") for `node_modules/@ogautama/premium-engine/{fonts,content,locales}/**`
  on whatever function ends up serving `pdf.ts` — otherwise the *first*
  Preview/Production request 500s while every local check passes clean
  (Vercel's bundler doesn't trace the `fs.readFileSync` calls `/pdf` makes
  at request time).

## Out of scope

- Emailing/WhatsApp-ing the PDF automatically — v1 is a direct download;
  the agent sends it to their client themselves.
- Storing the generated PDF file in Supabase Storage — it's regenerated on
  demand from the `Lead` row's `inputs` if ever needed again, not persisted
  as a file.

## Unit tests

- `quote.ts` action: given a fixture quote input, the created `Lead` row
  has `source: "calculator"`, `ownerId` equal to the signed-in member's id,
  `contact` equal to phone (falling back to email when phone is absent),
  and `inputs`/`result` populated from the request/`LeadRecord`; a
  honeypot-triggering submission creates **no** `Lead` row; an
  unauthenticated call is rejected.
- `theme.ts`: the exported value satisfies the `PdfTheme` type (mostly a
  compile-time check) and its `logo` is a well-formed `data:image/...`
  URI.
- Leads pages: the list's Calculator tab shows a calculator lead's
  product/plan/premium columns and omits DISC's "Profil"; the DISC tab
  still renders exactly as before (regression guard for the existing Plan
  16 tests); the detail page renders the calculator layout for a
  `source: "calculator"` lead and the DISC layout for a `source: "disc"`
  lead — in particular, a calculator lead's detail render must not touch
  `DISC_PROFILES`.
- `pdf.ts` action: given a fixture quote, returns non-empty bytes starting
  with the PDF magic header (`%PDF`) rather than asserting on rendered
  visual content; an unauthenticated call is rejected; passing a tampered
  client-side price alongside otherwise-valid inputs doesn't change the
  price embedded in the output (proves the server recomputes rather than
  trusting the client, same guard `examples/vercel/premium-pdf.ts`
  documents).

## Verification

- `npm run dev`, complete a full quote end-to-end in the browser pane:
  price a product, save it against a test client, confirm a new row shows
  up on `/member/leads`'s Calculator tab (and that the DISC tab still
  shows DISC leads untouched), open the calculator lead's detail page,
  download the PDF and open it — check the CONNECTeam logo/colors rendered
  instead of `premium-engine`'s `DEFAULT_THEME`.
- After the first Preview deploy, hit the PDF path once specifically —
  this is the README's called-out failure mode: passes every local/CI
  check, only 500s in an actual Vercel deployment if `includeFiles` is
  missing or wrong.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
