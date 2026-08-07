# Plan 23 — DISC share card (9:16 result image)

## Status

**Proposed 2026-08-07** — split out of [Plan 22](22-disc-test-redesign.md)
by decision (settled 2026-08-07): the redesign ships without it, because
the card is the one piece that needs new rendering machinery. Not
scheduled. The visual is already designed — see the "Simpan gambar
hasilnya" frame in
[spec-disc-redesign.html](../design/spec-disc-redesign.html).

## Goal

A personality result is the most naturally shareable thing this org
publishes, and today there is nothing to share — a prospect who wants to
show their "Sang Penata" has to screenshot a scrolling page. Add a
**"Simpan gambar hasilnya"** button to the result screen (and the sent
state) that produces a 9:16 image sized for a WhatsApp status: navy
gradient, CONNECTeam wordmark, profile title, blend line, the stacked DISC
spectrum with the dominant segments full-strength, a four-trait legend, and
a footer pointing back at the test.

Every share is a referral surface: the footer line is the only place the
org's URL appears in a stranger's WhatsApp status, so its exact copy (and
whether it can carry the sharer's own `?ref=` once they become a member) is
part of this plan's design work.

## Depends on

[Plan 22](22-disc-test-redesign.md) — the result screen this button lands
on, and the spectrum component the card mirrors.

## Open decision — rendering approach

The reason this is its own plan. Two candidates:

- **Client-side canvas** *(recommended)*. Render the card in a `<canvas>`
  and hand it over via `toBlob()` + a download/Web Share call. No new
  route, no result data leaving the device, works offline once loaded.
  Costs: fonts must be loaded and awaited before drawing (`document.fonts`
  — Geist is already self-hosted), and the drawing code is manual (no
  reusing the DOM styling).
- **Dynamic OG-image route** (e.g. `/tools/disc/card?d=…`). Clean server
  rendering (`next/og` renders JSX), and the same route would double as a
  real link preview if results ever became shareable URLs. Cost: the
  result has to be encoded in the URL — **a personality result in a
  shareable, loggable link** — which is exactly the kind of quiet PII leak
  this repo has avoided elsewhere. Mitigable (short-lived signed payloads),
  but that's real machinery for a nice-to-have.

Recommendation: client-side canvas. Decide at planning time for this plan,
not before.

## Scope (sketch — firm up when scheduled)

- Card renderer (canvas draw function or component) matching the mockup
  frame: 1080×1920 export, brand navy gradient, wordmark, kicker, title,
  blend, spectrum, legend, footer URL.
- "Simpan gambar hasilnya" on the result screen + "Simpan gambar" in the
  sent state (both placed in the mockup).
- Download on desktop; `navigator.share` with the image file on mobile
  where available, falling back to download.
- Tests: the draw function is pure enough to test its layout math
  (segment widths from percentages, remainder rule matching Plan 22's
  spectrum); the button wiring gets a smoke test with `toBlob` mocked.

## Out of scope

- Shareable result *URLs* (results stay device-local unless the OG route
  is chosen — and even then, only if a signed-payload design is accepted).
- Any change to scoring, profiles, or the lead flow.
- Instagram-story sizing variants, stickers, or per-profile artwork — one
  card, one size, first.
