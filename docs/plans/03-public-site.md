# Plan 03 — Public site pages

## Status

**Done** — implemented in [PR #8](https://github.com/ogautama/connecteam-web/pull/8).
Splitting Plan 02b's browser auth out of `@/lib/auth` (into `auth-browser.ts`
/ `supabase-server.ts`) so `/login`'s Client Component can call
`signInWithGoogle()` was done here, since Plan 03 is the first client-side
consumer. This also unblocks the "real Google sign-in landing in `/member`"
step that Plan 02b left open on `/login`.

Verified live end-to-end against the Supabase project (2026-07-21): an
invited leader signs in and reaches `/member`, a no-profile account lands
on `/not-invited`. That pass also surfaced and fixed a Plan 02b trigger bug
(`User.inviteCode` not populated — bundled in this PR at the reviewer's
request) and is documented in Plan 02b's "Local OAuth setup & live
verification" section.

Small refinements made during review, beyond the original scope:
- The header **Login** button signs in with Google directly instead of
  routing to `/login` first (one less click). `/login` remains as a
  standalone page.
- Settled the no-profile UX on the **standalone `/not-invited` page** as the
  single destination (`proxy.ts` / `requireRole` redirect there); dropped the
  originally-planned inline `/login?reason=not-invited` state as redundant.
  Added a **Home** button on `/not-invited` so a rejected visitor has a clear
  next step.

## Goal

Rebuild connecteam.id as a proper recruiting funnel instead of one long
Google Sites scroll: `/`, `/join`, `/login`.

## Depends on

Plan 01 (layout). Soft-depends on [Plan 02b](02b-supabase-auth-google-oauth.md)
for real login (see Independence notes).

*Updated 2026-07-21: `/login` below was originally an email/password form —
now a "Sign in with Google" button, per the Supabase Auth + Google OAuth
switch (see [00-overview.md](00-overview.md#why-supabase--vercel-instead-of-neon--authjs)).*

## Scope

- `/` — Home: hero (keep the punchy Bahasa-gaul voice — "Kerja Ngak Harus
  Ribet"), 4 value pillars (mentor, career speed, digital skills, positive
  environment), proof section (200+ agents, retention stat, testimonials),
  vision statement, a DISC-test teaser card linking to `/tools/disc`, a
  challenge/CTA section, footer with Instagram/TikTok links.
- `/join` — application landing page wrapping the existing Google Form
  embed (`https://docs.google.com/forms/d/e/1FAIpQLSdogN_R3VKMZgt4ifQMOH3oNu2nYMiwrGWPuYZH5yTKqzUJkA/viewform`).
  Rebuilding the form itself is out of scope for this plan.
- `/login` — a single "Sign in with Google" button calling
  `signInWithGoogle()` (Plan 02b), redirects to `/member` on success. If the
  signed-in Google account has no matching profile (no leader ever invited
  that email — see Plan 02b/02c), shows a clear "you haven't been added yet,
  ask your leader" state instead of a generic error. Replaces the old
  `secure.connecteam.id` link site-wide.
- Update header/footer nav in `MarketingLayout` (from Plan 01) to link these
  routes.

## Out of scope

`/tools/disc`, `/tools/calculator` (their own plans, though the home page
links to them), member space content.

## Independence notes

If Plan 02b hasn't merged yet, `/login`'s button is written against
`signInWithGoogle()` directly (Plan 02b's own exported function, not a
custom wrapper), so this plan doesn't need a bespoke mock — it just won't
successfully log in until Plan 02b's Supabase project/Google provider exist
server-side. The page and its tests (button renders, no-profile state
renders) don't require a live provider.

## Unit tests

- Home page renders all major sections (smoke test).
- `/login`: renders the "Sign in with Google" button; clicking calls
  `signInWithGoogle()`; renders the "not yet added" state when redirected
  back with a no-profile result.
- `/join` renders the embedded form iframe/link.

## Verification

- `npm run dev`, click through `/` → `/join` and `/` → `/login` in the
  browser pane; confirm layout, copy, and links render correctly at mobile
  and desktop widths.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
