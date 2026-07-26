# Plan 07 — Member: Quest Hub (`/member/onboarding`)

## Status

**Built** in [PR #18](https://github.com/ogautama/connecteam-web/pull/18)
(open). Two rounds of redesign got here:

1. **2026-07-24** — the flat Get Started page shipped in
   [PR #17](https://github.com/ogautama/connecteam-web/pull/17) (never
   merged, superseded) was redesigned into a gamified "quest hub"
   consolidating Plans 07–14, after the team was shown a UX reference (a
   working prototype built by someone else — purple/pink gradient, level
   tabs, progress bars, accordion checklists). That version had an in-page
   tab strip.
2. **2026-07-26** — the tab strip was dropped. It duplicated the left
   sidebar, so **the sidebar became the section switcher** and the menu was
   renamed to match the hub's vocabulary (table below). The seven
   standalone `/member/<section>` placeholder routes were deleted.

Plans 08–14 are revised in step (see each doc's own Status note) — they no
longer describe standalone pages, they describe the content that fills one
section of this hub.

### What carries over from the original PR #17 build

- Content module stays `src/content/onboarding.ts`, restructured (not
  replaced) — same five sections, now shaped as accordion items instead of
  flat cards.
- Same known content gaps: the "How Insurance Works" + 3 basics videos, the
  Telegram link, and all 4 Starter Kit PDFs still don't have real URLs (old
  Google Sites pages sit behind a Google-account gate — don't fabricate,
  keep the "Segera hadir" placeholder pattern per item).
- DISC link stays `/tools/disc` (Plan 04); the Recruitment Kit link now
  points at `?section=recruiting` instead of the deleted `/member/grow`.

## Goal

`/member/onboarding` — the member space's single page. Everything Plans
07–14 own lives here as a **section**, selected by `?section=<id>` and
switched from the left sidebar. There is no in-page tab strip: the sidebar
is the only navigation.

### Menu

| Sidebar item | `?section=` | Owner | Content |
|---|---|---|---|
| Dashboard | — (`/member`) | Plan 06 | real |
| Onboarding | *(default, bare path)* | Plan 07 | **real** |
| Recruiting | `recruiting` | Plan 08 | placeholder |
| Selling | `selling` | Plan 09 | placeholder |
| Calculator | `calculator` | Plan 05 | placeholder |
| References | `references` | Plans 10 + 11 | placeholder |
| ↳ Contests & Campaigns | `contests` | Plan 12 | placeholder |
| ↳ Events | `events` | Plan 13 | placeholder |
| Directory | `directory` | Plan 14 | placeholder |
| Add Member *(leader only)* | — (`/member/admin/add-member`) | Plan 02c | real |

Renames from the pre-2026-07-26 menu: Get Started → Onboarding, Grow →
Recruiting, Sell → Selling, Reference Data → References (with **Official
Systems folded into it**, per Plan 11's revision), Kontak → Directory.

**Calculator is a placeholder section, not a link to `/tools/calculator`** —
that page doesn't exist yet (Plan 05, deferred behind `CALCULATOR_LIVE`), so
linking it would 404. When Plan 05 ships, this section becomes its entry
point; decide then whether it embeds the tool or links out.

Only Onboarding ships real content. Every other section renders a
"Segera hadir" placeholder list — no fabricated copy or links — until its
own plan lands content.

## Depends on

Plan 06 (member shell/nav). Supersedes both Plan 06's 8-route sidebar and
the "each section is its own page" structure Plans 08–14 originally assumed
— see Plan 06's revision note.

## Design reference

[docs/design/spec-quest-hub.html](../design/spec-quest-hub.html) — static
mockup, brand-colored (navy `#183f87` → red `#f04975` → gold `#f5ba01`
gradient replacing the reference prototype's purple/pink) following the
house tokens in [spec.html](../design/spec.html). **Partly superseded**: it
still shows the in-page tab strip from round 1. Its card, colour, accordion
and placeholder-tag treatment all match what shipped; only the navigation
does not. See the banner at the top of that file.

## Explicitly deferred (not this plan, not "missing content")

Three things the reference prototype showed are new product features, not
copy to source, so they're intentionally left out rather than built quietly
alongside a visual reskin:

- **"Join & Isi Data" personal-data intake form** (KTP number, birth date,
  phone, bank account, NPWP). Real PII — needs its own plan covering
  schema, access control, and whether it needs encryption-at-rest.
- **Personal goals mini-form** (short/medium/long-term text goals, backed
  by a Google Form in the reference prototype). Lower sensitivity than the
  PII form, but still new data-entry surface.
- **Recruit-tracking mini-CRM** (add candidate names, FAST-score them
  Hot/Warm/Cold, CSV export) — flagged under Plan 08 since it's tied to
  that section's content. Rendered with a distinct "Di luar scope" tag so
  it reads as a deliberate omission, not an unsourced gap.

## Scope

### Shell (built)

- `MemberShell` (`src/components/layouts/MemberShell.tsx`) — the
  hide-able sidebar. One flag drives both breakpoints by inverting each
  side's classes: desktop starts visible and collapses, mobile starts
  closed and opens as an overlay drawer with a dismiss scrim. This also
  closes the member area's long-standing "no mobile nav at all" gap
  (tracked in [00-overview.md](00-overview.md#known-deferred-issues)).
- `MemberNav` — renders the table above, nesting References' children,
  with the active item derived from `?section=` rather than the path
  (every section shares one route). A parent does **not** light up for its
  child's section, so exactly one item ever reads as active.
- `QuestHub` — brand-gradient header, overall Onboarding progress bar
  (shown on every section), then either the checkable Onboarding accordion
  or the active section's placeholder list.
- Shared accordion item: icon, title, one-line description, optional
  checkbox, expand/collapse detail. Placeholders skip the accordion —
  their "Segera hadir"/"Di luar scope" tag *is* the content, so hiding it
  behind a click would be pointless.
- `OnboardingProgress` model for per-user persistence (below), replacing
  the reference prototype's `localStorage`.

### Onboarding content (real, migrated from the flat page)

Existing five sections (Know Yourself, Plan Your Goals, Learn, Just Do It,
Starter Kit) as accordion items, each with a stable `id`
(`ONBOARDING_SECTIONS` in `src/content/onboarding.ts`) used as the
`itemId` progress rows key off. **Renaming one loses members' checked-off
state** — treat them as stable once shipped.

### Other sections — placeholders (this plan); real content later (Plans 05, 08–14)

Rendered from a `SECTIONS` map in `QuestHub.tsx`. The References section's
category grouping (which plan's content sits under which heading) is
provisional — revisit when Plans 10–13 have real content in hand.

## Data model

```prisma
model OnboardingProgress {
  id          String   @id @default(cuid())
  userId      String
  itemId      String   // e.g. "know-yourself"
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
that already ran `requireMember()`. The toggle server action re-checks
`requireMember()` itself — Server Actions are reachable by direct POST, so
the page's guard can't be the only one.

Pure progress math lives in `src/lib/progress.ts`, apart from the
Prisma-touching reads/writes in `src/lib/onboardingProgress.ts`, so the
client component can import the former without bundling Prisma.

## Unit tests

- Content module: schema validation plus `id` uniqueness across the five
  Onboarding sections.
- Nav: label/href per role, References' nesting, `?section=`-driven active
  state (including a parent not lighting up for its child), and
  `isValidSection` rejecting junk **and `undefined`** — see the gotcha
  below.
- Progress: toggling creates/removes exactly one row; percentage math
  covered in isolation.
- Page: gated by `requireMember()` before any lookup; defaults to
  Onboarding; renders the section named in the query; falls back to
  Onboarding on junk rather than crashing; placeholder sections render no
  checkboxes.

### Gotcha found while building this

`isValidSection(undefined)` returned `true`. The route-only nav items
(Dashboard, Add Member) carry `section: undefined`, so a bare
`item.section === value` matched *a missing param* against them and waved
it through — handing the hub an undefined section, which crashed it. The
guard now rejects `undefined` explicitly. Any future "is this a valid X"
check over a list with optional fields wants the same care.

## Verification

`npm run dev`, log in, visit `/member/onboarding`, check a few Onboarding
items, reload, confirm state persisted server-side (not just in the
browser). Click through every sidebar item, collapse/restore the sidebar,
and check the mobile drawer. `npm run lint`, `npx tsc --noEmit`, `npm test`.

**Done so far** (PR #18): lint, `tsc`, and 172 unit tests pass; the
migration is applied to the shared dev Supabase project; sidebar contents
and nesting, every section's href, section switching, desktop
collapse/restore, and the mobile drawer + scrim were all verified in a
browser against a throwaway unauthenticated route (deleted before commit).
**Still unverified**: the signed-in checkbox round trip — it needs a real
Google account on the dev project's invite list, which the building session
didn't have.
