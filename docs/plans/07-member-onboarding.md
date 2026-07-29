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

3. **2026-07-29** — the menu was restructured again, this time from a real
   content inventory (a spreadsheet the team filled in), not a guess. Every
   top-level item gains real sub-items instead of being a bare placeholder
   `?section=` switch — see the rebuilt table below. Two structural decisions
   came out of that session:
   - **Still exactly two levels deep.** The sheet's 3rd level (its
     "Subcategory" column — e.g. Learning Center's five videos) becomes
     sections *inside* a page's content, not more sidebar entries.
     `MemberNav.tsx` already supports one level of children; nothing about
     its depth needs to change, only how many leaf items exist.
   - **Role gating is now Add Member only.** Events and Directory lose the
     "Leaders" badge/filtering they had — see Plans 13 and 14's revision
     notes, since both previously treated leader-only filtering as the
     centerpiece of their scope.
   - **Sidebar sections became independently collapsible** (a chevron per
     top-level item, separate from clicking its label), reset to "only the
     active section open" on every visit — no persisted state. This is on
     top of Plan 07's existing whole-sidebar hide/show; it's a second,
     finer-grained collapse *within* the visible sidebar.
   - **Some items point at the same content.** E.g. "Product Details" is the
     same page under both Selling ↳ Learning Center and References ↳
     Recording — edit once, both show the change. Today's static
     `SECTIONS`-object architecture can only fake this with copy-paste;
     [Plan 18](18-content-admin.md) proposes the real fix (a shared content
     key multiple nav items can point at) alongside admin-only in-app
     editing for pages that need updating monthly.

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

### Menu (rebuilt 2026-07-29 from the content-inventory sheet)

`↳` marks a child of the item above it — the sidebar's one supported nesting
level. Items with no `↳` are top-level and double as a landing page linking
to their own children. "Owner" is which plan sources that item's real
content; "moved from Plan N" flags content that plan already scoped under a
different section before this restructure — implementers should reconcile
against that plan's source-content list rather than re-capturing it from
scratch.

| Sidebar item | `?section=` | Owner | Content |
|---|---|---|---|
| Dashboard | — (`/member`) | Plan 06 | real |
| **Onboarding** | `onboarding` *(default)* | Plan 07 | **real** — existing 5 accordion items, kept |
| ↳ Join & Isi Data | `onboarding-join` | Plan 07 | deferred — PII intake form, see "Explicitly deferred" below |
| ↳ Download PruForce | `onboarding-pruforce` | Plan 07 | placeholder — moved from Plan 11 |
| ↳ Lisensi AAJI & AASI | `onboarding-lisensi` | Plan 07 | placeholder — moved from Plan 11 |
| ↳ Kelas MFC & Sertifikasi Produk | `onboarding-mfc` | Plan 07 | placeholder — moved from Plan 11 |
| ↳ Kenali Dirimu | `onboarding-kenali-dirimu` | Plan 07 | real — DISC/MBTI/Self Motivation upload, [Plan 17](17-mbti-self-motivation-result-upload.md) |
| ↳ Bikin Goals Pribadi / Susun Targetmu | `onboarding-goals` | Plan 07 | placeholder — goals mini-form still deferred, see below |
| ↳ Setup WA, IG | `onboarding-setup-wa-ig` | Plan 07 | placeholder |
| **Recruiting** | `recruiting` | Plan 08 | placeholder |
| ↳ Kenapa recruit dlu? | `recruiting-why` | Plan 08 | placeholder |
| ↳ Bank nama rekrut + FAST | `recruiting-bank-fast` | Plan 08 | placeholder |
| ↳ Presentasi bisnis ke calon rekrut | `recruiting-presentasi` | Plan 08 | placeholder |
| ↳ Handling Obj calon rekrut | `recruiting-handling-obj` | Plan 08 | placeholder — format not decided yet ("Bentuknya apa?" per the sheet) |
| **Selling** | `selling` | Plan 09 | placeholder |
| ↳ Learning Center | `selling-learning-center` | Plan 09 | placeholder — page with 5 in-page sections; its "Product Details" section is shared with References ↳ Recording, see Plan 18 |
| ↳ Bank nama rekrut + FORM | `selling-bank-form` | Plan 09 | placeholder — check against Plan 08's original FORM.pdf before treating as new |
| ↳ Sales Tools | `selling-sales-tools` | Plan 09 | placeholder — page with 7 in-page sections; absorbs Tabel Premi/Tabel Medical, **moved from Plan 10** |
| **Calculator** | `calculator` | Plan 05 | placeholder |
| **References** | `references` | *(split — see children)* | placeholder |
| ↳ Recording | `references-recording` | Plan 09 (new) | placeholder — page with 2 in-page sections; "Product Details" section shared with Selling ↳ Learning Center, see Plan 18 |
| ↳ Commission | `references-commission` | Plan 09 | placeholder — was part of Plan 09's Sales Kit reference tables, now its own item |
| ↳ Prestige | `references-prestige` | Plan 10 | placeholder — unchanged from Plan 10's existing scope |
| ↳ Schedule Book (PDF Download) | `references-schedule-book` | Plan 07 | placeholder — one of the Starter Kit PDF gaps already tracked in [00-overview.md](00-overview.md#known-deferred-issues) |
| ↳ Prupay Link | `references-prupay-link` | Plan 11 | placeholder — was "PRU PayLink", **moved from** Plan 11's Official Systems scope |
| ↳ Claim | `references-claim` | Plan 11 | placeholder — page with 2 in-page sections (How to Claim, Bukti Claim), unchanged from Plan 11's existing scope |
| ↳ Contests & Campaigns | `references-contests` | Plan 12 | placeholder |
| ↳ Events | `references-events` | Plan 13 | placeholder — **no longer role-gated**, see Plan 13's revision note |
| **Directory** | `directory` | Plan 14 | placeholder |
| ↳ Yellow Pages | `directory-yellow-pages` | Plan 14 | placeholder |
| ↳ Who is Prudential | `directory-who-is-prudential` | Plan 14 | placeholder — was "Prudential Indonesia" |
| ↳ Who is MRT Group | `directory-who-is-mrt` | Plan 14 | placeholder |
| ↳ Who is Connecteam | `directory-who-is-connecteam` | Plan 14 | placeholder — the old scope's "CONNECT with Leaders" isn't in the new sheet; confirm with the content owner whether it's dropped or renamed to this before assuming either |
| Add Member *(leader only)* | — (`/member/admin/add-member`) | Plan 02c | real |

Renames from the pre-2026-07-26 menu: Get Started → Onboarding, Grow →
Recruiting, Sell → Selling, Reference Data → References (with **Official
Systems folded into it**, per Plan 11's revision), Kontak → Directory.
References' internal grouping — previously an open question (see
[00-overview.md](00-overview.md#known-deferred-issues)) — is now resolved by
the table above: it's a flat list of 8 children, not further category
headers.

**Calculator is a placeholder section, not a link to `/tools/calculator`** —
that page doesn't exist yet (Plan 05, deferred behind `CALCULATOR_LIVE`), so
linking it would 404. When Plan 05 ships, this section becomes its entry
point; decide then whether it embeds the tool or links out.

Onboarding and Kenali Dirimu ship real content (the latter via Plan 17).
Every other item renders a "Segera hadir" placeholder — no fabricated copy
or links — until its own plan lands content. `HubSectionId` in
`src/lib/member/nav.ts` grows from 8 values to one per row above (~30) —
mechanically the same one-level-of-children shape it already has, just far
more leaves.

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

Rendered from a `SECTIONS` map in `QuestHub.tsx`. References' grouping is no
longer provisional — the 2026-07-29 menu table above is the resolved
structure; what's still open is which plan sources each item's real content
(also noted per-row above).

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
