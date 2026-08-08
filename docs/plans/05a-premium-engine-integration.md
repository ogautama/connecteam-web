# Plan 05a — Premium engine integration & pricing action

## Status

**Implemented 2026-08-08** in
[PR #52](https://github.com/ogautama/connecteam-web/pull/52). First of three sub-plans
replacing [Plan 05](05-calculator-tool.md)'s original scope — see that
doc's Status section for why. 05b and 05c build on this one.

## Why this replaces Plan 05's original scope

Decided 2026-08-08: the user has a working, real premium-pricing engine —
[`ogautama/premium-engine`](https://github.com/ogautama/premium-engine), a
private npm package extracted from a sibling app
(`olivegau-vision/form-lead-generator`) — and wants CONNECTeam's calculator
to be a real insurance premium/quotation tool built on it, not the
illustrative "how much could you earn" income estimator Plan 05 originally
scoped. Specifically:

- **Replaces** Plan 05's scope outright, not additive to it.
- **Member-only.** An agent tool for pricing real products for their own
  clients — closer in spirit to Plan 09's "Sell" content than to the DISC
  tool's public/referral-attributed pattern. No anonymous/public path.
- Ships with a downloadable, CONNECTeam-branded PDF quotation from day one
  (05c) — not deferred to a later plan.
- Only the two products `premium-engine` actually prices today
  (`life_PHE`, `critical_PCA`) go live now; the UI (05b) must be **driven
  off the package's `PRODUCTS` registry**, not hardcoded to those two, so
  adding `life_PF`/`critical_PCB` later is a `premium-engine` version bump
  with no UI changes required — only a version bump + review, per that
  package's own versioning policy (its README §7).

## What `premium-engine` provides (context for all three sub-plans)

Three entry points, strictly separated so the browser bundle never sees the
rate tables:

- `@ogautama/premium-engine/public` — browser-safe: the `PRODUCTS` registry
  (each product's bounds, plans, `sumAssuredOptions`, display name) and Zod
  schemas (`makePremiumInputSchema`, `makeQuoteInputSchema`). No rates.
- `@ogautama/premium-engine/server` — everything in `/public`, plus
  `calculatePremium`, `handlePremiumRequest` (price-only), `handleQuoteRequest`
  (price + a `LeadRecord` to persist), and the full rate tables. Server-only.
- `@ogautama/premium-engine/pdf` — `renderQuotationPdf`, `loadProductContent`,
  and a `PdfTheme` seam (brandName, logo, brand/protection/payment/tint
  colors, a 6-step benefit ramp) for a themed quotation PDF. Server-only,
  pulls in `pdfmake`/`fontkit`.

The package ships **no UI, no auth, no rate limiting, no lead storage** —
all of that is on these sub-plans. Its own `examples/vercel/*` are Vercel
serverless-function references (`api/*.ts` handlers); this repo uses
Next.js **Server Actions** exclusively for form-submit logic like this (see
`src/app/tools/disc/actions.ts` for the existing pattern), not API routes —
the examples are a reference for *what* to call, not *how* to wire it up
here.

## Goal

Get `@ogautama/premium-engine` installed and wired to a single, tested,
auth-gated Server Action that takes a premium-lookup request and returns a
priced result. No UI, no lead capture, no PDF yet (05b/05c) — this proves
the package boundary end-to-end (private-registry auth, `/server`-only
import discipline, input validation, real rate output) before anything is
built against it.

## Depends on

Plan 06 (member shell — `getCurrentUser()`, the `/member/**` auth gate).

## Manual steps (you)

- Generate a GitHub PAT scoped **`read:packages`** (Settings → Developer
  settings → Personal access tokens → Tokens (classic)), with read access
  to `ogautama/premium-engine`'s packages. **Mind the expiry**: classic
  PATs expire (or get revoked), and when this one dies, every Vercel build
  fails at `npm install` with no code change to blame. Either pick "No
  expiration" or calendar the renewal. Symptom to remember: a deploy that
  suddenly fails at the install step → check `NPM_TOKEN` before debugging
  anything else.
- Add `NPM_TOKEN=<token>` to your local shell profile (needed for every
  local `npm install` from here on, not just the first).
- Vercel dashboard → the **connecteam-web** project (not `premium-engine`'s
  or `form-lead-generator`'s own projects) → Settings → Environment
  Variables → add `NPM_TOKEN` for **Production, Preview, and Development**.

## Scope

- `.npmrc` at the repo root:
  ```
  @ogautama:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
  ```
  Safe to commit — it references an env var and holds no secret itself.
- `npm install @ogautama/premium-engine@0.1.0` — pinned to the **exact**
  version, no `^`/`~` (the package's own versioning policy, README §7: a
  rate or PDF-content change should be a reviewed diff on a deliberate
  bump, not something that floats in on a routine install).
- `src/lib/premium/pricing.ts` — a `"use server"` action, same shape as
  `src/app/tools/disc/actions.ts`'s existing pattern:
  - Requires `getCurrentUser()` to resolve to a signed-in member; rejects
    otherwise. Every caller here is signed-in by decision (member-only) —
    no anonymous path to design around, unlike DISC.
  - Delegates validation + pricing to `/server`'s `handlePremiumRequest`,
    passing the current date, rather than re-implementing input validation.
  - Returns the priced result (or the validation-error shape) as-is; no
    `Lead` write here — that needs a client name/contact, which doesn't
    exist until 05c's quote-capture step.
  - A comment at the top of the file calling out the "iron rule" from the
    package's own README: nothing that imports `/server` or `/pdf` may live
    outside a server-only file (`"use server"` actions, future server
    components) — this repo has no automated lint rule for that boundary,
    so it's a code-review discipline, not a build-time guarantee.

## Out of scope

- Any UI (05b).
- Lead persistence, PDF generation (05c).
- Products beyond what `premium-engine@0.1.0` ships (`life_PHE`,
  `critical_PCA`).

## Unit tests

- `pricing.ts` action:
  - Rejects when `getCurrentUser()` resolves to `null` (mock the auth
    module).
  - Given a valid input matching a **known fixture pulled from
    `premium-engine`'s own `src/domain/handlePremiumRequest.test.ts` /
    `engine.test.ts`** (don't invent a new input/expected-premium pair —
    the engine's own tests are the ground truth for what a correct price
    looks like; asserting against them here catches drift between what we
    assume the engine promises and what it actually returns), returns the
    same priced result.
  - Given an input outside a product's bounds (e.g. age too high), returns
    the engine's `422`/`AGE_OUT_OF_RANGE` shape rather than throwing.
- Proving `/server` never leaks into a client bundle is `premium-engine`'s
  own responsibility (its `test/entrypoint-isolation.test.ts`), not
  duplicated here.

## Verification

- No UI exists yet — verify via `npm test`, `npm run lint`, `npx tsc
  --noEmit`. A successful `npm install` against the private registry is
  itself a strong signal that `NPM_TOKEN`/`.npmrc` are wired correctly (it
  fails loudly otherwise).
- Confirm the install also works from a clean state (delete `node_modules`
  and reinstall) — catches "works because it was already installed before
  token setup" false positives.
- **Confirm this plan's own PR gets a green Vercel Preview build.** The
  local checks above never exercise the `NPM_TOKEN`-in-Vercel wiring — the
  deploy-time `npm install` is the only thing that does, and it's the whole
  point of the manual Vercel step. If that env var is missing or wrong, the
  failure should surface here, in this spike's Preview, not later inside
  05b's UI branch.
