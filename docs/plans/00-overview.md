# CONNECTeam website rebuild — plan overview

## Context

CONNECTeam is a youth-recruiting brand for a Prudential Indonesia insurance
agency network (part of MRT Group). Today it's two disconnected Google Sites:

- **connecteam.id** — public recruiting landing page (single scroll: hero,
  why-join, testimonials, stats, DISC test link, 7-day WA challenge, login
  link to `secure.connecteam.id`).
- **sites.google.com/view/connecteam** — a private 20-page "member space" for
  onboarding/enabling agents: onboarding checklists, recruiting kits, a full
  product catalog with training videos and commission tables, official
  Prudential system how-tos, an events calendar, and a contacts directory —
  built entirely from embedded PDFs/images/Drive links and WhatsApp/Telegram
  deep-links, gated only by "you have a Google account," with some sections
  labeled "(Leaders Only)" but not actually access-controlled.

Goal: rebuild both as one self-hosted Next.js app (`connecteam-web`). Not a
reskin — content and IA get rethought, real authentication + role gating
(agent vs leader) get added since member content includes commission data
and leader-only material, and two interactive tools get built in-house: an
income calculator (lead-gen) and a DISC personality test (replacing the
current external links to Google Forms / a 3rd-party test site). The new
member login replaces the old `secure.connecteam.id` link on the homepage.

## Working process for this rebuild

- Every unit of work below is its own **independent sub-plan** and will
  become its own **branch + PR**.
- Each PR ships with its own **unit tests** for the logic it introduces.
- **Nothing gets merged to `main` automatically** — PRs are opened for
  review and merged manually.
- Sub-plans are ordered by dependency, but written so each is reviewable and
  testable on its own (mocking/stubbing whatever an earlier PR hasn't landed
  yet, where practical).

## Tech decisions (apply across all sub-plans)

- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.
  (Scaffold already generated locally, uncommitted — see PR-01.)
- **Auth**: Auth.js (NextAuth v5), Credentials provider (email + password),
  JWT session carrying a `role` claim (`agent` | `leader`). Route protection
  via Next.js middleware on `/member/**`.
- **Database**: Postgres via Neon, accessed through Prisma ORM. Two models
  to start: `User` (email, passwordHash, name, role) and `Lead` (source,
  name, contact, inputs, result, createdAt) — captured from the calculator
  and DISC tools.
- **Content**: product catalog, reference tables, and static page copy as
  structured TypeScript/JSON data modules in-repo (no CMS for v1). Source
  PDFs/images re-hosted under `public/` or linked from Drive, organized by
  section instead of one flat sidebar.
- **Testing**: Vitest for unit tests (pure logic: scoring engines, role
  gating, content schema validation). Introduced in PR-01 so every later PR
  can add tests against a working setup.

## Sub-plan / PR sequence

| # | Sub-plan | Depends on | Doc |
|---|---|---|---|
| 01 | Project foundations (layouts, design tokens, test runner) | — | [01-foundations.md](01-foundations.md) |
| 02 | Data & auth layer (Prisma, Neon, Auth.js, role middleware) | 01 | [02-data-auth.md](02-data-auth.md) |
| 03 | Public site pages (`/`, `/join`, `/login`) | 01, 02\* | [03-public-site.md](03-public-site.md) |
| 04 | DISC test tool (`/tools/disc`) | 01, 02\* | [04-disc-tool.md](04-disc-tool.md) |
| 05 | Calculator tool (`/tools/calculator`) | 01, 02\* | [05-calculator-tool.md](05-calculator-tool.md) |
| 06 | Member space shell (`/member` dashboard + nav + gating) | 01, 02 | [06-member-shell.md](06-member-shell.md) |
| 07 | Member: Get Started (`/member/onboarding`) | 06 | [07-member-onboarding.md](07-member-onboarding.md) |
| 08 | Member: Grow (`/member/grow`) | 06 | [08-member-grow.md](08-member-grow.md) |
| 09 | Member: Sell (`/member/sell`) | 06 | [09-member-sell.md](09-member-sell.md) |
| 10 | Member: Reference Data (`/member/reference`) | 06 | [10-member-reference.md](10-member-reference.md) |
| 11 | Member: Official Systems (`/member/systems`) | 06 | [11-member-systems.md](11-member-systems.md) |
| 12 | Member: Contests & Campaigns (`/member/contests`) | 06 | [12-member-contests.md](12-member-contests.md) |
| 13 | Member: Events (`/member/events`) | 06 | [13-member-events.md](13-member-events.md) |
| 14 | Member: Directory (`/member/directory`) | 06 | [14-member-directory.md](14-member-directory.md) |

\* PR-03/04/05 depend on PR-02's *interfaces* (e.g. an `auth()` helper, a
`createLead()` function) but each PR stubs/mocks those where PR-02 hasn't
merged yet, so they don't block on merge order in practice — see each doc's
"Independence notes."

PRs 07–14 (the eight member-space sections) are fully independent of each
other — they only share PR-06's shell/layout/nav and can be built and
reviewed in any order or in parallel.

## Already in the working tree (uncommitted, not yet a PR)

From earlier exploration before this planning pass:

- Next.js 16 + TypeScript + Tailwind 4 scaffold (`create-next-app`), belongs
  to PR-01.
- `prisma/schema.prisma` drafted with the `User`/`Lead` models above, plus
  `prisma`, `@prisma/client`, `next-auth@beta`, `@auth/prisma-adapter`,
  `bcryptjs` installed — belongs to PR-02.

No branches, commits, or PRs have been created yet. Implementation is
paused pending your go-ahead on this plan.

## Source content reference

Full content inventory of the current Google Sites member space (page names,
links, files) was captured during exploration and is folded into each
relevant member-content sub-plan doc (07–14) rather than duplicated here.
