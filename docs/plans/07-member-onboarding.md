# Plan 07 — Member: Quest Hub (`/member/onboarding`)

## Status

**Original scope done** in [PR #17](https://github.com/ogautama/connecteam-web/pull/17)
— a flat single-page onboarding checklist. **Revised 2026-07-24**: redesigned
as a tabbed, gamified "quest hub" that consolidates Plans 07–14 into one
page, after the team was shown a UX reference (a working prototype built by
someone else — purple/pink gradient, level tabs, progress bars, accordion
checklists). This doc now describes the target design; implementation of the
new shell hasn't started yet. Plans 08–14 are revised in step (see each
doc's own Status note) — they no longer describe standalone pages, they
describe the content that fills one tab/category group of this hub.

### What carries over from the original PR #17 build

- Content module stays `src/content/onboarding.ts`, restructured (not
  replaced) — same five sections, now shaped as accordion items instead of
  flat cards.
- Same known content gaps: the "How Insurance Works" + 3 basics videos, the
  Telegram link, and all 4 Starter Kit PDFs still don't have real URLs (old
  Google Sites pages sit behind a Google-account gate — don't fabricate,
  keep the "Segera hadir" placeholder pattern per item).
- DISC link stays `/tools/disc` (Plan 04); Recruitment Kit link becomes an
  in-page tab switch to Recruiting instead of a route link to `/member/grow`
  (that route goes away, see Plan 06's note).

## Goal

`/member/onboarding` — the member space's single entry point: a tabbed quest
hub replacing both the old flat Get Started page *and* the 8-route sidebar
model Plan 06 originally built. Tabs:

1. **Onboarding** (Level 1, real content) — this plan's original scope,
   restructured into accordion checklist items with per-user completion
   tracking.
2. **Recruiting** (Level 2, placeholder shell) — Plan 08's content slot.
3. **Selling** (Level 3, placeholder shell) — Plan 09's content slot.
4. **Referensi** (static reference list, placeholder shell) — Plans
   10–13's content, grouped by category. No per-item progress — these are
   lookups, not tasks.
5. **Kontak** (static, placeholder shell) — Plan 14's content slot.

Only tab 1 ships with real content in this pass. Tabs 2–5 ship as working
accordion shells (expand/collapse, category headers) with a "Segera hadir"
body per section — the interaction is real, the copy is a placeholder
pending each tab's own plan landing real content.

## Depends on

Plan 06 (member shell/nav — its 8 sidebar links become anchors into this one
route instead of 8 routes; see Plan 06's revision note). Supersedes the
"each section is its own page" structure Plans 08–14 originally assumed.

## Design reference

[docs/design/spec-quest-hub.html](../design/spec-quest-hub.html) — static
mockup, brand-colored (navy `#183f87` → red `#f04975` → gold `#f5ba01`
gradient replacing the reference prototype's purple/pink) and following the
house style tokens already established in
[spec.html](../design/spec.html). Not shipped code — a comparison/reference
to build from, same convention as the existing `spec-alt-*.html` docs.

## Explicitly deferred (not this plan, not "missing content")

Two things the reference prototype showed are new product features, not
copy to source, so they're intentionally left out of this reskin rather than
built quietly alongside it:

- **"Join & Isi Data" personal-data intake form** (KTP number, birth date,
  phone, bank account, NPWP). Real PII — needs its own plan covering
  schema, RLS, and whether it needs encryption-at-rest, before anyone
  builds it.
- **Personal goals mini-form** (short/medium/long-term text goals, backed
  by a Google Form in the reference prototype). Lower sensitivity than the
  PII form, but still new data-entry surface — punting rather than bundling
  into a visual reskin.

Also deferred, flagged under Plan 08 since it's tied to that tab's content:
a recruit-tracking mini-CRM (add candidate names, FAST-score them
Hot/Warm/Cold, CSV export) shown in the Recruiting level of the reference
prototype.

## Scope

### Shell (new work, this plan)

- Header: brand-gradient banner, hub title, tagline, overall progress bar
  (aggregate % of Level 1–3 items completed; Referensi/Kontak don't count
  toward progress — they're reference material, not tasks).
- Tab strip: 5 tabs. Level tabs (1–3) show a numbered badge and an "x/y"
  completed counter; Referensi/Kontak don't.
- Shared accordion card component: icon, title, one-line description,
  optional checkbox (Level tabs only), expand/collapse for detail content.
  Built once, reused by every tab/plan.
- New `OnboardingProgress` model for persistence (see below) — real
  per-user storage via Supabase, not the reference prototype's
  `localStorage` shortcut, since we already have auth or a reason to skip
  it.

### Level 1 — Onboarding content (real, migrated from the current page)

- Existing five sections (Know Yourself, Plan Your Goals, Learn, Just Do
  It, Starter Kit) restructured into accordion items, each given a stable
  `itemId` for progress tracking (e.g. `onboarding.know-yourself.disc`).

### Tabs 2–5 — placeholder shells (this plan); real content later (Plans 08–14)

- Accordion sections render with provisional category headers and a
  "Segera hadir" body — no fabricated copy or links. Exact category
  grouping for the Referensi tab (which plan's content lands under which
  heading) is left to whoever builds Plans 10–13, not fixed here.

## Data model

New model for per-user progress (replaces the reference prototype's
`localStorage`):

```prisma
model OnboardingProgress {
  id          String   @id @default(cuid())
  userId      String
  itemId      String   // e.g. "onboarding.know-yourself.disc"
  completedAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])

  @@unique([userId, itemId])
}
```

Access control: **not** Postgres RLS — this codebase doesn't use it
anywhere (`User`/`PendingInvite`/`Applicant`/`Lead` are all scoped purely in
application code, since Prisma always connects with the unpooled
`DIRECT_URL`/`DATABASE_URL` credential, not through Supabase's
RLS-enforced anon/PostgREST path). `OnboardingProgress` follows the same
pattern: every query is scoped by `where: { userId }` inside server code
that already ran `requireMember()` first. Toggle via a server action; read
through the existing `getCurrentUser()`/`requireMember()` session plumbing.

## Unit tests

- Content module: schema validation (unchanged pattern) plus `itemId`
  uniqueness across all Level 1 items.
- Progress logic: toggling an item creates/removes exactly one row;
  aggregate percentage calculation is pure-logic-testable in isolation.
- Page: renders all 5 tabs; Level 1 accordion items are checkable and
  reflect persisted state across a reload; tabs 2–5 render their
  placeholder state; DISC link still points at `/tools/disc`.

## Verification

`npm run dev`, log in, visit `/member/onboarding`, check a few Level 1
items, reload, confirm state persisted server-side (not just in the
browser). Click through all 5 tabs. `npm run lint`, `npx tsc --noEmit`,
`npm test`.
