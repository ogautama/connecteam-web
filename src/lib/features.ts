// Temporary availability gates for the in-house tools. The public site (nav +
// home-page CTAs) links to these pages, but they aren't built until later
// plans — until then the links would 404, so they're gated off to keep a
// shareable staging site clean (Plan 03b).
//
// Flip each flag to `true` when its plan ships (and update the home-page test
// that asserts on the gated UI). One flag per tool because they land in
// separate plans.
export const DISC_LIVE = false; // Plan 04 — /tools/disc
export const CALCULATOR_LIVE = false; // Plan 05 — /tools/calculator
