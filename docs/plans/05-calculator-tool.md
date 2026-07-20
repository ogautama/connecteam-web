# Plan 05 — Calculator tool

## Goal

Build the income/earning-potential calculator at `/tools/calculator` — the
in-house replacement for the current "Challenge ACCEPTED" flow, which today
is just a WhatsApp deep-link with no interactivity. This is the
form-lead-generator tool referenced in the original request.

## Depends on

Plan 01 (layout). Soft-depends on Plan 02 for lead capture (see Independence
notes, same pattern as Plan 04).

## Scope

- `src/lib/calculator/model.ts` — pure function: takes inputs (hours
  committed per week, target closes per month, average premium/commission
  rate assumptions) and returns a projected monthly/annual income estimate
  plus a breakdown (base scenario, stretch scenario). Commission
  assumptions sourced from the product commission data gathered during
  exploration (see Plan 09's content inventory) — kept as a separate,
  clearly-commented constants module so the assumptions are easy to review
  and adjust independent of the calculation logic.
- `/tools/calculator` — form UI (sliders/inputs for hours, target closes,
  premium tier), live-updating results as inputs change, a results summary
  with the income breakdown.
- Lead capture: results screen ends with a name/WhatsApp-number form that
  calls `createLead({ source: "calculator", ... })`, replacing the current
  raw `wa.me` "Challenge ACCEPTED" link with an actual captured lead (the
  WhatsApp handoff can still happen after submission, e.g. redirect to a
  WA deep-link pre-filled with their result).

## Out of scope

Any change to actual commission-table content pages (Plans 09/10 own those);
this plan only borrows illustrative assumption constants.

## Independence notes

Same pattern as Plan 04: calculation logic and UI are fully independent and
testable; only final lead submission needs Plan 02's `createLead()`, stubbed
locally against the documented signature until Plan 02 merges.

## Unit tests

- `model.ts`: given fixed inputs, returns the expected income breakdown —
  cover a low-input case, a high-input case, and a zero-input edge case
  (should not throw or divide by zero).
- UI: changing an input updates the displayed result; lead form validates
  before submit; submit calls `createLead` with the current inputs and
  computed result attached.

## Verification

- `npm run dev`, exercise the calculator with a few input combinations in
  the browser pane, confirm results update live and the lead form submits
  cleanly (check network request / stub call).
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
