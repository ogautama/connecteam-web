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

- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 — see
  Plan 01.
- **Hosting**: Vercel.
- **Auth** *(revised 2026-07-21 — see Plan 02b)*: **Google OAuth only**, via
  Supabase Auth — no passwords anywhere. Gated by a **leader-created pending
  invite**: a leader adds a member's email first (Plan 02c); only then can
  that email sign in with Google and get a `role` claim (`agent` | `leader`)
  and a profile. Anyone who authenticates with Google but wasn't
  pre-invited gets a valid session and no access — `/member/**` rejects
  both unauthenticated and no-profile requests, via `proxy.ts` (Next 16
  renamed `middleware.ts`). Deactivation no longer takes effect on the
  user's very next request the way the original JWT design did — accepted
  as a 1–2 hour lag, since Supabase's tokens are verified without a DB
  round trip. See Plan 02b for the full design and Plan 15b's "Auth
  changes" supersession.
- **Database**: Postgres via **Supabase**, accessed through Prisma ORM
  (unchanged ORM choice — only the host moved, from Neon). Models: `User`
  (email, name, role, plus `position`/`status`/`recruiterId` tree fields
  from Plan 15 — no `passwordHash`, see Plan 02b), `PendingInvite` (Plan
  02b/02c — the invite gate above), `Lead` (source, name, contact, inputs,
  result, createdAt — calculator/DISC captures), and `Applicant` (Plan
  15/15b — recruitment form submissions, no longer auto-promoted to `User`).
- **File storage**: Supabase Storage (e.g. `Applicant` ID card photos, Plan
  15b) — signed/expiring URLs on read, gated the same way as the rest of
  that record.
- **Content**: product catalog, reference tables, and static page copy as
  structured TypeScript/JSON data modules in-repo (no CMS for v1). Source
  PDFs/images re-hosted under `public/` or linked from Drive, organized by
  section instead of one flat sidebar.
- **Testing**: Vitest for unit tests (pure logic: scoring engines, role
  gating, content schema validation). Introduced in Plan 01 so every later
  plan can add tests against a working setup. Note: anything that goes
  through Supabase's hosted Auth service (not just your own DB logic) isn't
  meaningfully mockable the way Auth.js's Credentials `authorize()` was —
  see Plan 02b's "Unit tests" section for what stays pure-logic-testable vs.
  what needs a real/local Supabase instance.

### Why Supabase + Vercel instead of Neon + Auth.js

Original decision (Plan 02) picked Neon (serverless Postgres) + Prisma +
Auth.js as the default well-documented combo for a Next.js app with custom
role logic. Revisited 2026-07-21: the team didn't want to manage several
separate platform accounts (DB host, auth library, a yet-undecided blob
store). Supabase bundles Postgres + Auth + Storage under one project: paired
with Vercel for hosting, that's two accounts instead of three-plus. Prisma
stays — it's ORM-agnostic to who hosts the Postgres. Auth.js's Credentials
provider is dropped in favor of Supabase Auth's Google OAuth, which also
removed the need to ever store or hash a password. Full tradeoff discussion
(including the two-step-user-creation and revocation-timing caveats) lives
in the session that produced Plans 02b/02c/15b; the load-bearing decisions
are captured inline in those docs so each can be picked up independently.

## Plan sequence

| # | Sub-plan | Depends on | Doc | Status |
|---|---|---|---|---|
| 01 | Project foundations (layouts, design tokens, test runner) | — | [01-foundations.md](01-foundations.md) | ✅ Done — [PR #1](https://github.com/ogautama/connecteam-web/pull/1) |
| 02 | ~~Data & auth layer (Prisma, Neon, Auth.js, role middleware)~~ | 01 | [02-data-auth.md](02-data-auth.md) | ✅ Done, superseded† — [PR #5](https://github.com/ogautama/connecteam-web/pull/5) |
| 02b | Supabase infra + Google OAuth (Postgres, Auth, pending-invite gate) | 01 | [02b-supabase-auth-google-oauth.md](02b-supabase-auth-google-oauth.md) | ✅ Done — [PR #7](https://github.com/ogautama/connecteam-web/pull/7) |
| 02c | Leader: Add Member (pending-invite creation UI) | 02b | [02c-leader-add-member.md](02c-leader-add-member.md) | Not started |
| 03 | Public site pages (`/`, `/join`, `/login`) | 01, 02b\* | [03-public-site.md](03-public-site.md) | ✅ Done — [PR #8](https://github.com/ogautama/connecteam-web/pull/8) |
| 03b | Staging deployment (public site) | 03 | [03b-staging-deploy.md](03b-staging-deploy.md) | Code gating done (PR #9); deploy = manual checklist |
| 04 | DISC test tool (`/tools/disc`) | 01, 02b\* | [04-disc-tool.md](04-disc-tool.md) | ✅ Done — [PR #10](https://github.com/ogautama/connecteam-web/pull/10) |
| 05 | Calculator tool (`/tools/calculator`) | 01, 02b\* | [05-calculator-tool.md](05-calculator-tool.md) | |
| 06 | Member space shell (`/member` dashboard + nav + gating) | 01, 02b | [06-member-shell.md](06-member-shell.md) | |
| 07 | Member: Get Started (`/member/onboarding`) | 06 | [07-member-onboarding.md](07-member-onboarding.md) | |
| 08 | Member: Grow (`/member/grow`) | 06 | [08-member-grow.md](08-member-grow.md) | |
| 09 | Member: Sell (`/member/sell`) | 06 | [09-member-sell.md](09-member-sell.md) | |
| 10 | Member: Reference Data (`/member/reference`) | 06 | [10-member-reference.md](10-member-reference.md) | |
| 11 | Member: Official Systems (`/member/systems`) | 06 | [11-member-systems.md](11-member-systems.md) | |
| 12 | Member: Contests & Campaigns (`/member/contests`) | 06 | [12-member-contests.md](12-member-contests.md) | |
| 13 | Member: Events (`/member/events`) | 06 | [13-member-events.md](13-member-events.md) | |
| 14 | Member: Directory (`/member/directory`) | 06 | [14-member-directory.md](14-member-directory.md) | |
| 15 | ~~Recruitment tree & applications (schema + access control)~~ | 02 | [15-recruitment-tree.md](15-recruitment-tree.md) | ✅ Done, partially superseded† — [PR #5](https://github.com/ogautama/connecteam-web/pull/5) |
| 15b | Recruitment tree rework (drop applicant→user promotion) | 02b | [15b-recruitment-tree-rework.md](15b-recruitment-tree-rework.md) | Not started |

† **2026-07-21**: switched from Neon + Auth.js/Credentials to Supabase +
Vercel + Google OAuth (see "Why Supabase + Vercel" above). Plan 02's
DB/auth scope is replaced by Plans 02b/02c; Plan 15's tree/visibility model
is untouched and stays as originally built, only its `promoteApplicant`/auth
sections are replaced, by Plan 15b. Both original docs are kept as a record
of what actually shipped in PR #5 — see each doc's superseded notice for
exactly what carries over vs. what's replaced.

\* Plans 03/04/05 depend on Plan 02b's *interfaces* (e.g. `getCurrentUser()`,
a `createLead()` function) but each plan's implementation stubs/mocks those
where Plan 02b hasn't merged yet, so they don't block on merge order in
practice — see each doc's "Independence notes."

Plans 07–14 (the eight member-space sections) are fully independent of each
other — they only share Plan 06's shell/layout/nav and can be built and
reviewed in any order or in parallel.

## Known deferred issues

- **Marketing header nav is cramped on mobile** (`MarketingLayout`, Plan 01).
  The four nav links (Home / Join Us / DISC Test / Income Calculator) wrap and
  crowd the logo below ~400px wide — surfaced building Plan 03, left as-is
  since it's shared chrome, not that plan's scope. Wants a responsive
  treatment (hamburger/collapse). Still open after Plan 04: only three links
  are live so far (the calculator stays gated until Plan 05), which keeps it
  tolerable. Worth doing as its own small plan when `CALCULATOR_LIVE` flips
  and the fourth link comes back.
- **`/join` embedded Google Form not verified for public access** (Plan 03).
  The iframe wiring works, but in a browser not signed into Google the embed
  showed Google's own sign-in prompt — unconfirmed whether that's just the
  test browser or the form's sharing settings requiring sign-in. Open the
  form's settings and confirm a logged-out visitor can view and submit it
  (this is a Google Form config check, not a code change). Moot once the form
  itself is rebuilt in-app, if that's ever scoped.

## Working tree state when this overview was written (historical)

From earlier exploration before this planning pass — since superseded by
Plan 01 and Plans 02/15 actually merging:

- Next.js 16 + TypeScript + Tailwind 4 scaffold (`create-next-app`), belongs
  to Plan 01.
- `prisma/schema.prisma` drafted with the `User`/`Lead` models above, plus
  `prisma`, `@prisma/client`, `next-auth@beta`, `@auth/prisma-adapter`,
  `bcryptjs` installed — belongs to Plan 02.

No branches, commits, or PRs have been created yet. Implementation is
paused pending your go-ahead on this plan.

## Source content reference

Full content inventory of the current Google Sites member space (page names,
links, files) was captured during exploration and is folded into each
relevant member-content sub-plan doc (07–14) rather than duplicated here.
