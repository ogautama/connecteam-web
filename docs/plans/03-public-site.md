# Plan 03 — Public site pages

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
