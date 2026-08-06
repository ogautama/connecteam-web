// Public-site listing gates for the in-house tools: whether the marketing
// nav and home-page CTAs link to them. `false` hides the links only — it
// never gates the route itself.
//
// Flip a flag (and update the home-page test that asserts on the gated UI)
// when a tool's listing status changes. One flag per tool because they ship
// in separate plans.
//
// DISC is shipped (Plan 04) but deliberately UNLISTED since 2026-08-06:
// prospects are meant to reach /tools/disc through a member's referral link
// (Plan 16), not the site nav, so the page stays live and public while the
// links are hidden. The calculator is unlisted because it isn't built yet
// (Plan 05, deferred) — its links would 404.
export const DISC_LISTED = false; // Plan 04 shipped; unlisted by choice — see above
export const CALCULATOR_LIVE = false; // Plan 05 — /tools/calculator
