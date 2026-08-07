# Plan 22 — DISC test redesign (referrer-first, three screens)

## Status

**Planned 2026-08-07.** Analysis + mockup in
[spec-disc-redesign.html](../design/spec-disc-redesign.html) (open in a
browser — before/after phone frames for all three screens, the four edge
states, and the decisions), merged with this doc via
[PR #45](https://github.com/ogautama/connecteam-web/pull/45). All five open
decisions were settled 2026-08-07, each on the recommendation — recorded in
the mockup's "Decisions" section and repeated below where they bind this
plan.

## Goal

Since [PR #41](https://github.com/ogautama/connecteam-web/pull/41) the DISC
test is unlisted: prospects arrive on a member's `?ref=` link, on a phone,
from WhatsApp. The page still behaves like a page you browsed to — a
marketing hero that sits above all 24 questions *and* the result (480 of 812
mobile pixels, permanently; question 1 renders with zero of four options
above the fold), a progress bar that reads 0% on question 1 and never
reaches 100%, back-navigation that discards the answer, no persistence
across a refresh, a result laid out as a blog post under the stale hero, and
three competing CTAs at the end. Above all: `?ref=` is read for lead
ownership and **never shown** — the member sends the link personally, and
the page asks their prospect for a WhatsApp number with no name attached to
the request.

Rebuild the surface as three screens that each own the viewport — intro,
test, result — with the referrer named from the first screen to the final
ask. The instrument itself does not change.

## Depends on

[Plan 04](04-disc-tool.md) (the tool) and
[Plan 16](16-disc-lead-visibility.md) (`?ref=` attribution,
`resolveRecruiter`, `/member/leads`) — both shipped.
[Plan 21](21-marketing-header-responsive.md) is independent but **goes
first by choice** (settled 2026-08-07): the header is the first thing a
referred prospect sees, and it has zero slack at 375px.

## Decisions (settled 2026-08-07)

- **Referrer display: first name only, brand fallback.** A public page
  resolving `?ref=` into a member's name makes invite codes enumerable into
  names, so: first word of `User.name`, never the full name, email, or
  photo; absent/unknown codes fall back to the brand treatment ("CONNECTeam
  · tes gaya kerja") silently — no error, no different copy that would
  confirm a code exists. Lead *ownership* is untouched: `resolveRecruiter()`
  already falls back to the root leader server-side.
- **Everything stays free.** No withholding the result behind the contact
  form. The ask is earned by naming the referrer, not by a paywall.
- **Share card is not in this plan** — split out to
  [Plan 23](23-disc-share-card.md). No "Simpan gambar" button ships here;
  it appears when Plan 23 does.
- **Header fix is not in this plan** — [Plan 21](21-marketing-header-responsive.md),
  first.
- **Percentages keep their independent rounding** (`score.ts` untouched);
  the stacked spectrum gives its **last segment the remainder** so the bar
  always closes at 100% visually. Display-level fix only.

## Design (from the mockup)

Three screens, each owning the viewport:

1. **Intro** — referrer chip ("**Olivia** ngajak kamu ikut tes ini"), title,
   two-line explainer, the four-color DISC strip as a teaser, one "Mulai
   tes" button pinned to the bottom with the "~2 menit · gratis" line under
   it. The old hero's content lives here and only here.
2. **Test** — sticky top bar: "← Sebelumnya", "7 / 24", and **24 ticks**
   that fill per *answered* question (so the last answer reads 24/24, not
   96%). Fixed-height question well sized to the longest prompt in the bank,
   so the four options never move between questions. Options carry 1–4 key
   badges; the selected state holds ~150ms before advancing so a tap is
   acknowledged. Auto-advance on a fresh answer; revisiting an answered
   question shows the pick plus an explicit "Lanjut →", so review costs
   nothing.
3. **Result** — a card (brand gradient bar) leading with the profile name,
   one **stacked spectrum** of all four traits with the non-dominant
   segments dimmed, then the four traits **ranked**, dominant ones marked
   "dominan". Below: the unchanged profile copy (strengths / atWork /
   watchOut blocks), then the one ask — a card addressed from the referrer
   ("Mau Olivia bahas hasilnya bareng kamu?", button "Kirim hasil ke
   Olivia", privacy line naming Olivia as the only recipient). "Gabung
   Sekarang" moves to the **sent** state, offered after the visitor already
   said yes to a conversation. "Ulangi tes" stays, as the quiet last link.

Edge states (all drawn in the mockup): no/unknown ref (brand fallback),
returning mid-test (resume prompt), signed-in member (auto-save card, no
referrer chrome, no form, no Gabung), and sent.

## Scope

- **`src/app/tools/disc/page.tsx`**
  - The hero section moves out of the server page into the client
    component's intro screen; the page becomes header + `<DiscTest>`.
  - Resolves the referrer for display, server-side: reads `searchParams.ref`
    and passes `referrerName` (string | null) to `DiscTest`. The page is
    already dynamic (`getCurrentUser()` reads cookies), so no rendering-mode
    change.
- **`src/lib/leads.ts` or a small new module** — `getReferrerFirstName(
  inviteCode?: string): Promise<string | null>`: looks up
  `User.inviteCode`, returns the first whitespace-separated token of
  `User.name`, `null` otherwise. Selects only `name`. This is the **only**
  thing the page learns about the member.
- **`src/app/tools/disc/DiscTest.tsx`** — the rebuild:
  - Screen state: `intro` → questions → result (result stays derived from
    `answers` being complete; intro is explicit state so a resumed session
    can skip it).
  - Progress ticks + corrected semantics: `role="progressbar"` counts
    *answered* questions with a matching `aria-valuenow`; the four options
    become a `radiogroup` (`role="radio"`, roving tabindex); focus moves to
    the new prompt on advance; a polite live region announces "Pertanyaan N
    dari 24".
  - Keyboard: 1–4 select, arrow keys move within the group.
  - Persistence: answers + current step in `localStorage` under a versioned
    key (e.g. `disc-test-v1`); written on every answer; cleared on reaching
    the result, on "Ulangi tes", and on "Mulai dari awal". A stored partial
    session shows the resume prompt ("Lanjutin dari pertanyaan 12?") instead
    of the intro.
  - Result screen per the mockup: spectrum (last segment takes the
    remainder), ranked trait list with "dominan" pills, profile copy blocks
    unchanged, referrer-addressed lead form, sent state carrying "Lihat cara
    gabung" (→ `/join`).
  - Signed-in member branch keeps its auto-save behavior, restyled into the
    new card; no referrer chrome, no form, no Gabung.
- **`src/app/tools/disc/actions.ts`** — unchanged. `saveDiscLead` keeps
  re-scoring server-side and resolving ownership from `ref`; the client
  passing a display name changes nothing about attribution.
- **Tests** (`src/app/tools/disc/__tests__`, plus the new resolver):
  - `getReferrerFirstName`: known code → first name only (multi-word name
    truncates), unknown code → `null`, absent → `null`.
  - Intro renders referrer chip with name / brand fallback without one;
    "Mulai tes" enters the test.
  - Completing all questions still reaches the result (existing test,
    updated for the intro).
  - Ticks/aria: after answering N, `aria-valuenow === N`.
  - Back preserves the answer and shows "Lanjut →"; answering a fresh
    question auto-advances.
  - Persistence: answers restored from storage → resume prompt; "Mulai dari
    awal" clears; reaching the result clears.
  - Result: dominant traits marked, spectrum widths sum to 100.
  - Lead form: button/copy carry the referrer name (fallback copy without),
    validation messages unchanged, sent state shows "Lihat cara gabung".
  - Signed-in: auto-save card, no form rendered.

## Watch out for

- **Display resolution and ownership resolution are separate paths.** Don't
  refactor `resolveRecruiter()` to serve both — it returns the root leader
  for unknown codes, which is right for ownership and wrong for display
  (the fallback would name the root leader on every bad link).
- **Don't widen the lookup.** `getReferrerFirstName` selects `name` only;
  no email, no id back to the client. The client receives a string.
- **`useSearchParams` stays under `<Suspense>`** if `ref` continues to be
  read client-side for the save path (it should — attribution behavior is
  unchanged). The server page reading `searchParams` for display is
  additive.
- **Auto-advance vs. review.** The advance-on-answer rule applies only when
  the question was previously unanswered; changing an existing answer stays
  put and leaves "Lanjut →" — otherwise editing answer 3 of 24 teleports
  you forward 21 times.
- **The ~150ms acknowledgment delay** must not double-fire on fast taps —
  disable the group while the timer runs.
- **`localStorage` can be full/blocked** (Safari private mode): wrap in
  try/catch, degrade to today's in-memory behavior silently.
- **Version the storage key.** If the question bank ever changes length,
  stored answers must be discarded, not misapplied — the key carries `v1`
  and the payload stores `answers.length` to validate against
  `DISC_QUESTIONS.length`.
- **Fixed well height** is a CSS `min-height` sized to the longest prompt at
  375px — assert nothing; if a future prompt overflows, the well grows and
  the design degrades gracefully.

## Out of scope

- The share card and any image-rendering machinery —
  [Plan 23](23-disc-share-card.md).
- The marketing header — [Plan 21](21-marketing-header-responsive.md).
- Any change to `src/lib/disc/questions.ts`, `src/lib/disc/score.ts`
  (`BLEND_MARGIN` included), or `src/content/disc-profiles.ts` — every
  profile string is used verbatim.
- Any change to `saveDiscLead`, `createLead`, `resolveRecruiter`, the
  `Lead` schema, or `/member/leads`.
- Listing the page — `DISC_LISTED` stays false; the nav link and home-page
  teaser stay gone; the member onboarding link stays.

## Verification

- `npm run dev`, at 375×812: arrive with a real member's `?ref=` link →
  chip shows the first name; complete the test → result → submit the form →
  lead appears on that member's `/member/leads` with the WhatsApp number.
- Same flow with no `ref` and a garbage `ref` → brand fallback, lead owned
  by the root leader (existing behavior).
- Mid-test refresh → resume prompt → "Lanjutin" continues at the right
  question; "Mulai dari awal" starts clean.
- Signed-in member (onboarding link) → auto-save card, no form.
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
