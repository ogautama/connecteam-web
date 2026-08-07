# Plan 21 — Marketing header responsive treatment

## Status

**Done** — [PR #46](https://github.com/ogautama/connecteam-web/pull/46).
This is the "marketing header nav is cramped on mobile" item from the
overview's Known deferred issues, promoted to its own plan — re-measured
2026-08-07 while analyzing the DISC page (where it's most visible, since
[PR #41](https://github.com/ogautama/connecteam-web/pull/41) made `?ref=`
links the page's whole audience), and worse than the original note said.
Ordered **before** [Plan 22](22-disc-test-redesign.md) (the DISC redesign)
by decision: this header is the first thing a referred prospect sees.

## The problem, measured

`MarketingLayout`'s header is one flex row with `justify-between` and no
responsive treatment at all — no breakpoint, no collapse, nothing hidden on
small screens. Measured on the running page with the two currently-live nav
links (Home, Join Us):

| viewport | logo | nav | Login | gaps |
|---|---|---|---|---|
| 375px | 24→163 | 163→274 | 274→351 | **0px, 0px** |
| 320px | 24→163 | 163→254 ("Join Us" wraps to two lines) | 254→330 (past the padding) | 0px, 0px |

At 375px the row is *exactly* full — 24 + 139 + 111 + 77 + 24 = 375 — so
`justify-between` has no free space to distribute and the three groups sit
flush: "CONNECTeamHome" reads as one word. That it fits at all is
coincidence, not design. Below 375px it breaks outright: at 360px (the most
common Android width) there's already −15px, and at 320px "Join Us" wraps
and the Login pill runs through the container's right padding.

Signed-in members are worse off: `AccountMenu` renders the member's name,
which is wider than the 77px Login pill for almost any real name.

## Goal

The header lays out correctly from 320px up, with visible breathing room
between logo, nav, and the Login button / account menu — on `/`, `/join`,
and `/tools/disc` equally (it's shared chrome). No visual change at
desktop widths.

## Depends on

Plan 01 (the layout is its). Nothing depends on this plan's internals, but
[Plan 22](22-disc-test-redesign.md) is sequenced after it by choice.

## Decisions

- **No hamburger yet.** With two live links a menu button is more chrome
  than content. The original deferred-issue note already called this out:
  the full collapse becomes worth it when `CALCULATOR_LIVE` flips and the
  roster returns to four links — that stays deferred, and this plan leaves
  a note in the doc when the time comes.
- **Mobile treatment = shrink and drop "Home".** Below `sm` (640px):
  - the "Home" nav item is hidden — the logo already links to `/`, so the
    link is duplicated chrome at the exact width where it costs 38px + gap;
  - container padding steps down (`px-6` → `px-4`) and nav/list gaps
    tighten (`gap-6` → `gap-4`);
  - the logo keeps its size — it's the brand, the whitespace gives first.
  - Result at 320px with room to spare: 16 + 139 + 16 + 49 + 16 + 77 + 16
    = 329 ≈ full, so also drop the Login pill's horizontal padding one step
    at the same breakpoint (`px-5` → `px-4`, −8px) → 321… still tight; take
    the nav gap to `gap-3` if needed. The plan's acceptance bar is the
    measurement, not the exact utility classes: **≥ 8px of real gap between
    each group at 320px**, verified in the browser, classes adjusted until
    true.
- **`AccountMenu` truncates.** The signed-in trigger gets `max-w` +
  `truncate` below `sm` so a long name ellipsizes instead of squeezing the
  nav. Desktop unchanged.

## Scope

- **`src/components/layouts/MarketingLayout.tsx`** — the header row only:
  responsive padding/gap classes, `hidden sm:block` (or equivalent) on the
  Home `<li>`. The footer is fine (it already stacks) and stays untouched.
- **`src/components/layouts/AccountMenu.tsx`** — mobile truncation on the
  trigger label only; menu contents unchanged.
- **Tests** (`src/components/layouts/__tests__`) — update the layout
  test: Home link present at desktop (it renders; class assertions are
  brittle, so assert the class token on the item rather than computed
  layout), all `NAV_LINKS` still render for crawlers/screen readers where
  hidden-vs-removed matters — decide in implementation whether hidden-Home
  is `hidden sm:block` (still in the DOM; fine for tests) and assert
  accordingly.

## Watch out for

- **Don't remove Home from `NAV_LINKS`** — hide it responsively. The array
  also expresses intent for the day the hamburger arrives, and removing it
  would change desktop.
- **`AccountMenu` vs `HeaderLoginButton` widths differ** — verify the
  signed-in state at 320/360/375 too, not just the Login pill. Signed-in
  verification on `/member/*` pages is the user's (Google OAuth), but the
  marketing header renders signed-in on public pages via `getCurrentUser()`
  — a seeded local session can cover it; otherwise hand that pass over
  explicitly.
- **`h-header` (4.5rem) stays** — nothing here changes header height, so
  nothing downstream (scroll offsets, member shell) can be affected.
- **Tailwind 4** — arbitrary breakpoints aren't needed; `sm:` is the only
  boundary this plan uses.

## Out of scope

- A hamburger/drawer nav — deferred until the fourth link returns
  (`CALCULATOR_LIVE`), per the original overview note.
- `MemberShell` / member-area chrome (already responsive, Plan 07).
- The DISC page itself — [Plan 22](22-disc-test-redesign.md).
- Any nav content change (links, order, labels) beyond hiding Home below
  `sm`.

## Verification

- Browser pane at 320, 360, 375, 640, 1280: logo / nav / button groups have
  visible gaps (≥ 8px at 320), nothing wraps, nothing overflows the
  padding; desktop pixel-identical to today.
- Same sweep on `/join` and `/tools/disc` (shared chrome, three pages, one
  change).
- `npm run lint`, `npx tsc --noEmit`, `npm test`.
