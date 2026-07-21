# Plan 03b — Staging deployment (public site)

## Status

Code side **done** in [PR #NN](https://github.com/ogautama/connecteam-web/pull/NN)
— the unbuilt tool links are gated off so a deployed public site has no dead
links. The actual Vercel/Supabase staging setup is a manual checklist (below)
for you to run; nothing else in the app blocks it.

## Goal

Get a shareable staging URL of the public funnel (`/`, `/join`, `/login`) so
people outside the repo can review copy, layout, and the sign-in flow —
without hitting pages that don't exist yet.

## Depends on

[Plan 03](03-public-site.md). Reuses the Supabase project and OAuth setup from
[Plan 02b](02b-supabase-auth-google-oauth.md) — see its "Local OAuth setup &
live verification" section for the env/config gotchas (they recur per
environment, so they apply to the deployed origin too).

## What this plan changes in code (this PR)

Per-tool availability flags in `src/lib/features.ts` (`DISC_LIVE`,
`CALCULATOR_LIVE`, both `false`). While a flag is off, the shared nav link and
the home-page CTA/teaser for that tool are hidden (`MarketingLayout`,
`src/app/page.tsx`), so the site never links to a 404. Flip a flag to `true`
when its plan ships:

- `DISC_LIVE` → **Plan 04** (`/tools/disc`)
- `CALCULATOR_LIVE` → **Plan 05** (`/tools/calculator`)

Flipping a flag also means updating the home-page test that asserts the gated
links are absent (`src/app/__tests__/page.test.tsx`).

## Manual staging setup (you)

1. **Vercel project** linked to this repo (Plan 02b's manual steps already
   scoped this).
2. **Env vars** on Vercel (Preview + Production): `DATABASE_URL`, `DIRECT_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SEED_LEADER_EMAIL`. **The DB password must be
   URL-encoded the same way as locally** — `$`→`%24` etc. (see Plan 02b); the
   dotenv-expand trap doesn't apply on Vercel, but the URL-encoding of special
   characters still does.
3. **Supabase → Authentication → URL Configuration**: add the deployed origin
   to **Redirect URLs** (`https://<your-staging-host>/**`) and set an
   appropriate **Site URL**. Vercel preview URLs change per deployment — use a
   stable alias/domain for staging, or add the wildcard Vercel domain.
   (Google Cloud's OAuth client already points at the Supabase callback; that
   doesn't change per app origin.)
4. **Google consent screen**: while it's in *Testing*, only allowlisted
   test-user emails can complete Google sign-in — add each reviewer's email,
   or publish the consent screen to production. **Public pages need none of
   this**; it only gates login.

## What reviewers can check, by milestone

- **Now (03 + 03b):** the public funnel — `/`, `/join`, and the login
  round-trip (invited account → `/member`, which 404s until Plan 06;
  no-profile account → `/not-invited`).
- **After Plans 04 & 05:** flip the flags — DISC test and calculator live, the
  public site is complete with no hidden links.
- **After Plan 06 (+ 02c):** the gated member area behind login; with 02c a
  leader can invite reviewers themselves instead of DB inserts.

## Out of scope

Deploying the member area for external review — that needs Plan 06's shell
(and practically Plan 02c). This plan is the public site only.
