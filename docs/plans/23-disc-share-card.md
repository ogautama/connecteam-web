# Plan 23 — DISC share card (9:16 result image)

## Status

**Done** — split out of [Plan 22](22-disc-test-redesign.md) by decision
(settled 2026-08-07), then scheduled and built the same day. The visual came
from the "Simpan gambar hasilnya" frame in
[spec-disc-redesign.html](../design/spec-disc-redesign.html); the footer is
new, and is the one part of the card the mockup didn't draw.

Both open decisions settled 2026-08-07:

- **Client-side canvas**, on the recommendation below. The card is drawn in
  an off-screen `<canvas>` and handed over via `toBlob()`; the result never
  leaves the device.
- **The footer carries the referrer as a QR, not as text.** The *printed*
  URL is the landing page, host only, and next to it the referrer's
  "Pengundang / Unit" leader — so someone who types the URL instead of
  scanning still knows which unit to name on the join form. This was the
  user's call and it improves on both options originally offered: the QR
  keeps onward shares attributed without publishing an invite code in
  legible text, which is what putting `?ref=` in the printed line would have
  done.

Two deviations from the mockup, both decided while building:

- **The legend swatches are full strength**; only the bar segments dim to
  .45. The mockup's own markup does this (the `<i>` swatches carry no
  opacity) — the earlier draft dimmed both, and a key whose swatch is fainter
  than the segment it names is just harder to read.
- **C renders as brand-navy-300 on the card**, not the brand-navy-700 that
  `TRAIT_META` uses on screen. Navy-700 *is* the card's background, so a
  C-dominant profile's biggest segment would have vanished. The mockup's
  legend made the same substitution.

## Goal

A personality result is the most naturally shareable thing this org
publishes, and today there is nothing to share — a prospect who wants to
show their "Sang Penata" has to screenshot a scrolling page. Add a
**"Simpan gambar hasilnya"** button to the result screen (and the sent
state) that produces a 9:16 image sized for a WhatsApp status: navy
gradient, CONNECTeam wordmark, profile title, blend line, the stacked DISC
spectrum with the dominant segments full-strength, a four-trait legend, and
a footer pointing back at the test.

Every share is a referral surface: the footer is the only place the org
reaches a stranger's WhatsApp status, so it carries all three things such a
stranger needs — a QR straight to the referrer's link, a typable URL, and
the unit name that makes the typed route credit the same people the scanned
one does.

## Depends on

[Plan 22](22-disc-test-redesign.md) — the result screen this button lands
on, and the spectrum component the card mirrors. Shipped.

## Decision — rendering approach (settled 2026-08-07)

The reason this was its own plan. Two candidates:

- **Client-side canvas** *(chosen)*. Render the card in a `<canvas>` and
  hand it over via `toBlob()` + a download/Web Share call. No new route, no
  result data leaving the device, works offline once loaded. Costs: fonts
  must be loaded and awaited before drawing (`document.fonts` — Geist is
  self-hosted by `next/font`), and the drawing code is manual (no reusing
  the DOM styling).
- **Dynamic OG-image route** (e.g. `/tools/disc/card?d=…`). Clean server
  rendering (`next/og` renders JSX), and the same route would double as a
  real link preview if results ever became shareable URLs. Cost: the
  result has to be encoded in the URL — **a personality result in a
  shareable, loggable link** — which is exactly the kind of quiet PII leak
  this repo has avoided elsewhere. Mitigable (short-lived signed payloads),
  but that's real machinery for a nice-to-have.

## What shipped

- **`src/lib/disc/spectrum.ts`** — `spectrumWidths` moved out of
  `DiscTest.tsx`, because the card has to close its bar at exactly the same
  place the page does. Same function, same remainder rule, now shared.
- **`src/lib/disc/shareCard.ts`** — the card as a function of a canvas
  context. 1080×1920, every measurement derived from the mockup's 320px
  frame at one scale factor (`S = 1080/320`), laid out bottom-up so the
  block sits on the bottom edge whatever height the title wraps to.
  `spectrumSegments` and `shareCardFileName` are exported for their own
  tests. No DOM, no browser APIs beyond the context — that's what makes it
  testable.
- **`src/app/tools/disc/ShareCardButton.tsx`** — everything browser-shaped:
  the QR encoder (dynamically imported on click, not on page load), font
  resolution, `toBlob`, and the share-vs-download fork.
  `navigator.canShare({ files })` is checked with the actual file, since
  desktop Chrome has a share sheet that refuses files; an `AbortError` from
  a dismissed sheet is not treated as a failure.
- **`src/lib/referrer.ts`** — `getReferrerUnitName(inviteCode)`, the nearest
  leader **at or above** the referrer. Full name, deliberately: it has to
  match a `/join` picklist entry, and that picklist already publishes every
  leader's full name on a public page.
- **Placement** — "Simpan gambar hasilnya" on the result screen above
  "Ulangi tes" (offered whatever the visitor did about the ask, including to
  a signed-in member), and "Simpan gambar" in the sent state next to "Lihat
  cara gabung".
- **`qrcode-generator`** added: zero runtime dependencies, ships its own
  types, and exposes the module matrix (`isDark`) rather than an image — so
  the QR is drawn as rects at whatever cell size keeps every edge on a whole
  pixel, which is what a scanner is least tolerant of getting wrong.

## Tests

- `spectrumSegments`: tiles the bar edge to edge with no gap or overhang,
  the last segment absorbs the rounding, dominance marked, never negative.
- `drawShareCard` against a recording context: the gradient fills the frame
  first, every string that should reach the card does, the unit block
  disappears without a referrer, no drawn line escapes the card, a long unit
  name shrinks rather than running off, and **`ref=` is never printed**.
- `getReferrerUnitName`: walks to the nearest leader, is its own unit when
  the referrer *is* a leader, null on unknown/no code, gives up on a cycle.
- `ShareCardButton`: downloads with the slugged filename when there's no
  share sheet, hands the `File` to `navigator.share` when there is (and does
  not also download), encodes the test link with and without `?ref=`, treats
  a dismissed sheet as a non-event, surfaces a real failure.
- `DiscTest`: the button is on the result, in the sent state, and for a
  signed-in member.

## Out of scope

- Shareable result *URLs* — results stay device-local.
- Any change to scoring, profiles, or the lead flow.
- Instagram-story sizing variants, stickers, or per-profile artwork — one
  card, one size, first.
