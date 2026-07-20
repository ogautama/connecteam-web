# Plan 03 — Public site pages

## Goal

Rebuild connecteam.id as a proper recruiting funnel instead of one long
Google Sites scroll: `/`, `/join`, `/login`.

## Depends on

Plan 01 (layout). Soft-depends on Plan 02 for real login (see Independence
notes).

## Scope

- `/` — Home: hero (keep the punchy Bahasa-gaul voice — "Kerja Ngak Harus
  Ribet"), 4 value pillars (mentor, career speed, digital skills, positive
  environment), proof section (200+ agents, retention stat, testimonials),
  vision statement, a DISC-test teaser card linking to `/tools/disc`, a
  challenge/CTA section, footer with Instagram/TikTok links.
- `/join` — application landing page wrapping the existing Google Form
  embed (`https://docs.google.com/forms/d/e/1FAIpQLSdogN_R3VKMZgt4ifQMOH3oNu2nYMiwrGWPuYZH5yTKqzUJkA/viewform`).
  Rebuilding the form itself is out of scope for this plan.
- `/login` — email/password form calling Auth.js `signIn("credentials", ...)`,
  redirects to `/member` on success. Replaces the old `secure.connecteam.id`
  link site-wide.
- Update header/footer nav in `MarketingLayout` (from Plan 01) to link these
  routes.

## Out of scope

`/tools/disc`, `/tools/calculator` (their own plans, though the home page
links to them), member space content.

## Independence notes

If Plan 02 hasn't merged yet, `/login`'s submit handler is written against the
`auth.ts` `signIn` call directly (Auth.js's own API, not a custom wrapper),
so this plan doesn't need a bespoke mock — it just won't successfully log in
until Plan 02's Credentials provider exists server-side. The page and its
tests (form validation, error state rendering) don't require a live
provider.

## Unit tests

- Home page renders all major sections (smoke test).
- `/login` form: shows validation error on empty submit; calls `signIn`
  with entered credentials; shows an error message when `signIn` resolves
  with an error.
- `/join` renders the embedded form iframe/link.

## Verification

- `npm run dev`, click through `/` → `/join` and `/` → `/login` in the
  browser pane; confirm layout, copy, and links render correctly at mobile
  and desktop widths.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
