# Plan 01 — Project foundations

## Status

**Done** — merged via [PR #1](https://github.com/ogautama/connecteam-web/pull/1).

## Goal

Stand up the app shell everything else builds on: scaffold, design tokens,
shared layouts, and the test runner — with no auth or DB dependency, so this
plan is fully self-contained.

## Depends on

Nothing.

## Scope

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 scaffold
  (`create-next-app`) — already generated locally, just needs committing on
  its own branch.
- Tailwind design tokens (`tailwind.config`/`globals.css`): color palette,
  type scale, spacing — reflect the brand's youthful-but-credible-insurance
  tone (current site uses a purple/pink/blue gradient youth aesthetic; keep
  that energy but clean it up).
- `src/components/layouts/MarketingLayout.tsx` — header (logo, nav links,
  login button), footer (social links, copyright), used by all public
  pages.
- `src/components/layouts/MemberLayout.tsx` — sidebar nav shell (static
  placeholder links for now — real gating comes in Plan 06), header with
  user menu placeholder.
- Replace `create-next-app` boilerplate `page.tsx`/`layout.tsx`/`README.md`
  with a minimal placeholder home page using `MarketingLayout`, so the app
  runs and shows something coherent.
- Vitest + React Testing Library setup (`vitest.config.ts`, `npm test`
  script), since every later plan needs a place to put unit tests.

## Out of scope

Auth, database, real page content — all later plans.

## Independence notes

Nothing to stub — this plan has no external dependencies.

## Unit tests

- `MarketingLayout` and `MemberLayout` render children and expected nav
  landmarks (smoke test via React Testing Library).
- Vitest config itself verified by one trivial passing test.

## Verification

- `npm run dev` shows the placeholder home page using the new layout.
- `npm run lint`, `npx tsc --noEmit`, `npm test` all pass.
