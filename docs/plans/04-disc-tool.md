# Plan 04 — DISC test tool

## Goal

Replace the external link to a 3rd-party DISC test
(`tes.anthonykusuma.com/disc/tes`) with an in-house, original assessment at
`/tools/disc`.

## Depends on

Plan 01 (layout). Soft-depends on [Plan 02b](02b-supabase-auth-google-oauth.md)
for lead capture (see Independence notes). `createLead()` itself is
unaffected by the Supabase/auth rework — only the doc pointer moved from
Plan 02 (superseded) to 02b.

## Scope

- `src/lib/disc/questions.ts` — ~24-28 original forced-choice questions
  (4 statements per question, one per DISC trait: Dominance, Influence,
  Steadiness, Conscientiousness), written fresh — **not** copied from the
  linked 3rd-party test or any vendor's proprietary question bank. DISC as
  a framework (Marston's four-factor model) is public domain; the specific
  question wording is what's proprietary elsewhere, so originality here
  matters.
- `src/lib/disc/score.ts` — pure function: takes answers, returns trait
  scores + the dominant 1-2 trait profile.
- `src/content/disc-profiles.ts` — written profile copy per
  dominant-trait combination (short description, strengths, how this shows
  up in sales/recruiting work — ties back to the business).
- `/tools/disc` — multi-step question UI (client component, local state,
  progress indicator) ending in a results screen with trait breakdown
  (simple bar visualization) and profile copy.
- Optional final step: "Save your result / talk to us" contact capture
  (name + WhatsApp number) that calls `createLead({ source: "disc", ... })`.

## Out of scope

Any change to the existing MBTI/self-motivation external links referenced
in the member space (those stay as external links per the approved
overview plan).

## Independence notes

The question bank, scoring function, and results UI have zero dependency on
Plan 02b. Only the final "save your result" lead-capture step needs
`createLead()`; while Plan 02b is unmerged, that step calls a local
`createLead` stub matching the documented signature (see
[02b-supabase-auth-google-oauth.md](02b-supabase-auth-google-oauth.md), same
`createLead` signature Plan 02 originally documented) so the UI is fully
built and tested, and swapping in the real `src/lib/leads.ts` import is a
one-line change once Plan 02b lands.

## Unit tests

- `score.ts`: given a fixed set of answers, returns the expected trait
  scores and correct dominant trait(s) — cover a clear-D case, a tied
  D/I case, and an all-S case.
- Question bank integrity test: exactly one statement per trait per
  question, no duplicate statements.
- UI: completing all questions reaches the results screen; results screen
  renders the profile copy matching the computed dominant trait; lead
  capture form validates a non-empty name/contact before calling
  `createLead`.

## Verification

- `npm run dev`, complete the test end-to-end in the browser pane for at
  least two different answer patterns, confirm results differ accordingly.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
