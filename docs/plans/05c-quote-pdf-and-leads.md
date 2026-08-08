# Plan 05c — Client quote capture and branded PDF

## Status

**Implemented 2026-08-08** in
[PR #54](https://github.com/ogautama/connecteam-web/pull/54). Third of three
sub-plans replacing
[Plan 05](05-calculator-tool.md)'s original scope — see
[Plan 05a](05a-premium-engine-integration.md) for the full pivot rationale
and what `premium-engine` provides.

Four things came out differently from what's written below, each because
the shipped `premium-engine@0.1.0` didn't match what the plan assumed.
They're recorded here rather than silently absorbed into the code:

1. **`handlePremiumRequest`, not `handleQuoteRequest`.** The quote entry
   point can't serve this flow: `makeQuoteInputSchema` pins `sumAssured`
   to `def.sumAssuredOptions` (four fixed amounts), which contradicts
   05b's shipped free-form sum assured, and `handleQuoteRequest` ignores
   `paymentTerm` entirely — it always prices the product default, so an
   agent who quoted "sampai usia 99" would have "10 tahun" saved against
   their client's name. `quote.ts` prices through
   `handlePremiumRequest` (as `pricing.ts` already does) and builds the
   `LeadRecord` shape app-side instead. The honeypot question is moot:
   this action is member-only, so there is no anonymous path to protect
   and no honeypot field.
2. **One action, not two.** The plan sketched separate `quote.ts` and
   `pdf.ts` actions and then flagged the hazard itself — two pricings
   seconds apart can straddle midnight and disagree across an
   insurance-age boundary. `saveQuoteAndRenderPdf` prices once and feeds
   both the stored `Lead` and the document from that single result, which
   removes the failure mode instead of guarding against it (the plan
   explicitly allowed "or generate both in one action"). `pdf.ts` remains
   a module, not an action — one fewer action endpoint exposed.
3. **No logo in the theme.** `PdfTheme.logo` is declared on the type but
   engine 0.1.0's renderer never reads it (verified against
   `dist/pdf.js`); the header it draws is `brandName` in `colors.brand`.
   Setting it would mean carrying ~120 KB of base64 PNG for something
   nothing renders, so `theme.ts` omits it with a note, and a test guards
   the omission so a future engine bump surfaces the decision. Colors and
   brand name do apply — verification below is against those, not a logo.
4. **`outputFileTracingIncludes`, not `vercel.json`'s `includeFiles`.**
   Vercel doesn't apply `functions.includeFiles` to Next.js builds; the
   Next-native equivalent is `outputFileTracingIncludes` in
   `next.config.ts`, keyed on the route (`/member/calculator`). The
   package also had to join `serverExternalPackages` — bundled, `/pdf`'s
   `import.meta.url`-relative `readFileSync` calls resolve into
   `.next/server/**` and miss regardless of what's traced. Both were
   verified against a real `next build`: the route's `.nft.json` lists
   all seven font/content/locale files with the rule and zero without it,
   so the trap the plan describes is confirmed *and* confirmed fixed
   without waiting on a Preview deploy.

## Depends on

[Plan 05b](05b-premium-calculator-ui.md) (the priced quote form).

## Goal

Turn a priced result into something an agent can actually hand a client:
save it as a `Lead` (so it shows up on `/member/leads` the way DISC results
already do) and generate a CONNECTeam-branded PDF quotation to download.

## Scope

- **Client-quote form step**: once 05b shows a priced result, an "Simpan &
  buat PDF" step collects the client's name + phone/email (mirrors
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
  **Visibility is deliberate, not inherited by accident**: calculator
  leads flow through the same downline-scoped `getLeadsForViewer`, so
  every leader up the chain sees an agent's quotes — client name, contact,
  product, premium. That's client financial data, a step beyond a
  prospect's DISC result, and it's the intended behaviour (recorded
  2026-08-08): leads visibility follows Plan 16's hierarchy model
  regardless of source.
  Scope: the list gains a source switcher (two tabs, DISC / Calculator,
  DISC remaining the default so existing behaviour is unchanged) with
  per-source columns — the Calculator view shows product, plan, sum
  assured, and premium in place of "Profil"; the detail page branches on
  `lead.source`, keeping the existing DISC layout untouched and adding a
  calculator layout (client name/contact, product + plan, sum assured,
  premium breakdown, quoting agent, date — display only, no "download PDF
  again" button; see the recompute-every-time rule under `pdf.ts` below).
  The page intro copy ("Hasil tes DISC dari link referral kamu…") and the
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
  - **Recompute every time, at the current date — decided 2026-08-08
    (user's call).** This is a live calculator: every PDF generation is a
    fresh server-side pricing at today's date, and the PDF itself is
    never stored anywhere — it's returned as a download the agent saves
    locally. There is deliberately **no** "regenerate this PDF from a
    saved Lead" path: premium depends on the client's insurance age at
    the quote date and on the current rate tables, so a regeneration
    months later could silently disagree with what the client was
    originally told. Instead of pinning regeneration to the original
    quote date and guarding against rate drift (considered, rejected as
    complexity a live calculator doesn't need), wanting the PDF again
    simply means running the calculator again — a fresh quote at
    today's rates, honestly. The `Lead` row remains the historical
    record of what was quoted and when. One implementation note:
    `quote.ts` and `pdf.ts` each price independently, seconds apart in
    the same flow — pass the same quote date from the quote step into
    the PDF step (or generate both in one action) so a midnight
    rollover that crosses an insurance-age boundary can't make the PDF
    disagree with the stored `Lead`.
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
- Storing the generated PDF anywhere (Supabase Storage or otherwise) — it
  exists only as the download the agent saves locally. Needing it again
  means a fresh run of the live calculator, not a regeneration (see the
  recompute-every-time rule in Scope).

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

## Open question for a future plan

The engine's `id` locale mostly uses this repo's sharia wording
("Kontribusi Anda", "Santunan meninggal") — but two strings in the
rendered document still don't: the page-1 eyebrow reads **"ILUSTRASI
PREMI"**, and one `critical_PCA` checkmark reads **"Manfaat meninggal
100% UP cair"**. Both are `premium-engine`'s copy, not this repo's, so
neither is fixable from here — they need a change to the package's
`locales/id.json` and `content/critical_PCA.md`. Noted rather than
worked around, since both products priced today are syariah (see the
per-product terminology decision, 2026-08-08).

## Verification

- `npm run dev`, complete a full quote end-to-end in the browser pane:
  price a product, save it against a test client, download the PDF from
  the calculator flow and open it — check the CONNECTeam logo/colors
  rendered instead of `premium-engine`'s `DEFAULT_THEME`. Then confirm the
  new row shows up on `/member/leads`'s Calculator tab (and that the DISC
  tab still shows DISC leads untouched) and its detail page renders the
  calculator layout (display only — no PDF button there).
- After the first Preview deploy, hit the PDF path once specifically —
  this is the README's called-out failure mode: passes every local/CI
  check, only 500s in an actual Vercel deployment if `includeFiles` is
  missing or wrong.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
