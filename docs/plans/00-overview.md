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
  section instead of one flat sidebar. *(Narrow exception, 2026-07-29 — see
  [Plan 18](18-content-admin.md)):* a small set of pages flagged as "living
  documents" needing at-least-monthly updates (Contests & Campaigns,
  Recording) move to a database-backed `ContentBlock` model with an
  admin-gated edit UI, once Plan 18 ships. Everything else stays static.
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
| 05 | Calculator tool (`/tools/calculator`) | 01, 02b\* | [05-calculator-tool.md](05-calculator-tool.md) | ⏸ Deferred‡ |
| 06 | Member space shell (`/member` dashboard + nav + gating) | 01, 02b | [06-member-shell.md](06-member-shell.md) | ✅ Done — [PR #12](https://github.com/ogautama/connecteam-web/pull/12); nav reworked 2026-07-26§ |
| 07 | Member: Quest Hub (`/member/onboarding`, all member sections) | 06 | [07-member-onboarding.md](07-member-onboarding.md) | Shell + Onboarding content built, other sections are placeholders by design — [PR #18](https://github.com/ogautama/connecteam-web/pull/18) (open); supersedes [PR #17](https://github.com/ogautama/connecteam-web/pull/17)§ |
| 07c | Join Us → Profile: link an existing member's email (no auto-invite) | 07, 02b | [07c-join-existing-member-linking.md](07c-join-existing-member-linking.md) | ✅ Built — [PR #26](https://github.com/ogautama/connecteam-web/pull/26), merged into the Plan 07 branch; ships to `main` with [PR #18](https://github.com/ogautama/connecteam-web/pull/18) |
| 08 | Member: Grow (Recruiting section content) | 07 | [08-member-grow.md](08-member-grow.md) | Revised§ — content only, no own route |
| 09 | Member: Sell (Selling section content) | 07 | [09-member-sell.md](09-member-sell.md) | Revised§ — content only, no own route |
| 10 | Member: Reference Data (References section category) | 07 | [10-member-reference.md](10-member-reference.md) | Revised§ — content only, no own route |
| 11 | Member: Official Systems (folded into References) | 07 | [11-member-systems.md](11-member-systems.md) | Revised§ — no own route *or* nav item |
| 12 | Member: Contests & Campaigns (own section, nested under References) | 07 | [12-member-contests.md](12-member-contests.md) | Revised§ — content only, no own route |
| 13 | Member: Events (own section, nested under References) | 07 | [13-member-events.md](13-member-events.md) | Revised§ — content only, no own route |
| 14 | Member: Directory (Directory section content) | 07 | [14-member-directory.md](14-member-directory.md) | Revised§ — content only, no own route |
| 15 | ~~Recruitment tree & applications (schema + access control)~~ | 02 | [15-recruitment-tree.md](15-recruitment-tree.md) | ✅ Done, partially superseded† — [PR #5](https://github.com/ogautama/connecteam-web/pull/5) |
| 15b | Recruitment tree rework (drop applicant→user promotion) | 02b | [15b-recruitment-tree-rework.md](15b-recruitment-tree-rework.md) | Not started |
| 16 | DISC lead visibility (hierarchy-scoped `/member/leads`) | 04, 06, 15 | [16-disc-lead-visibility.md](16-disc-lead-visibility.md) | Not started |
| 17 | MBTI / Self Motivation result upload (Onboarding "Kenali Dirimu") | 07 | [17-mbti-self-motivation-result-upload.md](17-mbti-self-motivation-result-upload.md) | ✅ Done — [PR #22](https://github.com/ogautama/connecteam-web/pull/22) |
| 18 | IT & Content Admin (admin/super-admin roles, editable living-document content) | 02b, 07 | [18-content-admin.md](18-content-admin.md) | Proposed 2026-07-29 — scheduled after 07–14 ship |
| 19 | Profile page redesign (per-section editing, masked KTP) | 07, 07c | [19-profile-redesign.md](19-profile-redesign.md) | Proposed 2026-08-06 — mockup approved, [spec](../design/spec-profile-redesign.html) |

§ **2026-07-24, revised 2026-07-26**: after being shown a UX reference (a
working "quest hub" prototype — gamified level tabs, progress bars,
accordion checklists, purple/pink gradient), Plans 07–14 were consolidated:
instead of 8 separate member-space pages linked from Plan 06's sidebar, they
now share one page — `/member/onboarding` — brand-colored (navy/red/gold)
instead of the reference's purple/pink.

The first cut (07-24) put an in-page tab strip on that page. On **07-26**
that was dropped: it duplicated the left sidebar, so **the sidebar became
the section switcher** (`?section=<id>`), the seven standalone section
routes were deleted, and the menu was renamed to the hub's vocabulary — Get
Started → Onboarding, Grow → Recruiting, Sell → Selling, Reference Data →
References (**Official Systems folded into it**), Kontak → Directory, plus
a new **Calculator** section. The sidebar also became hide-able (collapsible
on desktop, drawer on mobile), which closed the "no mobile nav" gap. Full
menu table in [Plan 07](07-member-onboarding.md).

Plan 07 owns the shared shell (sidebar nav, progress bar, accordion
component, per-user progress persistence); Plans 08–14 each own the content
for one section or category group within it. Only Plan 07's own "Onboarding"
content ships with real copy — everything else ships as placeholder shells
until its content is sourced, same "don't fabricate" rule as before. Three
things the reference prototype showed are treated as new product decisions,
not content to source, and are deferred to their own future plans (see
"Known deferred issues" below): a PII intake form (KTP/bank/NPWP), a
personal-goals form, and a recruit-tracking CRM table with CSV export.

† **2026-07-21**: switched from Neon + Auth.js/Credentials to Supabase +
Vercel + Google OAuth (see "Why Supabase + Vercel" above). Plan 02's
DB/auth scope is replaced by Plans 02b/02c; Plan 15's tree/visibility model
is untouched and stays as originally built, only its `promoteApplicant`/auth
sections are replaced, by Plan 15b. Both original docs are kept as a record
of what actually shipped in PR #5 — see each doc's superseded notice for
exactly what carries over vs. what's replaced.

‡ **2026-07-21**: Plan 05 is deferred by choice, not blocked — no other plan
depends on it, and `CALCULATOR_LIVE` (`src/lib/features.ts`) already hides
the nav link and home-page teaser, so the site stays coherent without it.
Two things stay open while it's parked: Plan 03b's "public site complete"
milestone (flipping `CALCULATOR_LIVE`) and the mobile-nav issue below, which
only bites once the fourth nav link returns. Plan 16 notes calculator leads
as future scope but works on DISC leads alone.

\* Plans 03/04/05 depend on Plan 02b's *interfaces* (e.g. `getCurrentUser()`,
a `createLead()` function) but each plan's implementation stubs/mocks those
where Plan 02b hasn't merged yet, so they don't block on merge order in
practice — see each doc's "Independence notes."

Plans 07–14 (the eight member-space sections) are content-independent of
each other — each owns its own `src/content/*.ts` module and can be sourced
in any order. *(Updated 2026-07-24: they're no longer route-independent —
see § above. Plan 07 now owns the shared shell all of them render into, so
08–14 depend on Plan 07's shell landing first; before that, they only shared
Plan 06's nav.)*

## Known deferred issues

- **PII intake form not scoped yet** (surfaced by the 2026-07-24 quest-hub
  redesign, Plan 07). The reference prototype's Onboarding level included a
  form collecting KTP number, birth date, phone, bank account, and NPWP.
  Real personal/financial data — needs its own plan covering schema, RLS,
  and whether encryption-at-rest is warranted, before anyone builds it.
  Deliberately left out of Plan 07's shell work.
- **Recruit-tracking CRM table not scoped yet** (same source, Plan 08). The
  reference prototype's Recruiting level included a mini-CRM: add candidate
  names, score them Hot/Warm/Cold via the FAST framework, export to CSV.
  New interactive functionality with its own data-model needs, not "content
  to source" — needs its own plan. Deliberately left out of Plan 08.
- ~~**References section's internal grouping is provisional**~~ —
  **resolved 2026-07-29** by a real content-inventory sheet, not a guess.
  References is now a flat list of 8 items (Recording, Commission, Prestige,
  Schedule Book, Prupay Link, Claim, Contests & Campaigns, Events) — no more
  category headers. Content ownership moved across several plans in the
  process (Tabel Premi/Medical: Plan 10 → 09; PRUForce/Lisensi/MFC: Plan 11 →
  07's Onboarding; PayLink/Claim stay on Plan 11 but flatten out of "Official
  Systems") — see [Plan 07's menu table](07-member-onboarding.md#menu-rebuilt-2026-07-29-from-the-content-inventory-sheet)
  for the authoritative mapping and each of Plans 08–14's revision notes for
  what specifically changed in their scope. The same session also decided
  role gating is now Add-Member-only (Plans 13/14's leader-only filtering is
  dropped) and scoped [Plan 18](18-content-admin.md) for admin-editable
  "living document" pages and content shared across multiple nav positions
  (e.g. Product Details under both Selling and References).
- **`Calculator` is a placeholder section, not the tool** (Plans 05 + 07).
  The 2026-07-26 menu added a Calculator item, but `/tools/calculator`
  doesn't exist (Plan 05 deferred, `CALCULATOR_LIVE` off), so it renders a
  "Segera hadir" placeholder rather than linking to a 404. When Plan 05
  ships, decide whether that section embeds the tool or links out — and
  whether the member-area entry point changes Plan 05's public-page scope.
- ~~**Onboarding checklist should shrink from 7 items to 4**~~ — **built
  2026-08-05.** Two calls made 2026-08-05, both mocked up in
  [spec-profile-menu.html](../design/spec-profile-menu.html), both now
  shipped on the Plan 07 branch; the mockup carries a banner saying it
  reflects shipped behavior. `ONBOARDING_SECTIONS` is down to Download
  PruForce, Kenali Dirimu, Bikin Goals Pribadi and Setup WA/IG, and the
  migration `20260805110000_drop_join_isi_data_progress` deleted the one
  dead `join-isi-data` row (verified: the member's `MemberIntake` row and
  uploads were untouched). `submitJoinData` also stopped writing that
  progress row — left in place it would have re-created exactly the dead
  state the migration deletes. The original decision, kept for the record:
  (1) **"Isi Data" moves out into a "Profile" account-menu item.** It's
  personal data a member revisits, not a one-time onboarding step, so it
  belongs with the account rather than in a checklist that's meant to empty
  out. The entry point lands in the account dropdown (`AccountMenu.tsx`)
  labeled "Profile", above "Member Space"; no new sidebar item, and
  `/member/isi-data` itself is untouched. (2) **`lisensi-aaji-aasi` and
  `kelas-mfc-sertifikasi` get hidden** — both are `"Segera hadir"`
  placeholders with no content behind them. Checked 2026-08-05: no
  `OnboardingProgress` row exists for either id, so hiding them costs nobody
  progress. Confirmed 2026-08-05 this is deliberately **not** "hide every
  placeholder": `download-pruforce` and `setup-wa-ig` are equally empty
  placeholders and stay, so it's a specific call about licensing/class
  content, not a rule. **Settled 2026-08-05:** the existing
  `join-isi-data` `OnboardingProgress` rows get **deleted** as part of the
  build rather than left orphaned — change (1) removes the only row that
  could ever display them, so keeping them would just be dead state.
  (There is exactly one such row today.) **Resolved during the build:** the
  "Isi Data" page heading, its `<title>`, and the `/join` success copy that
  pointed at it were all renamed to **"Profile"**, so nothing user-facing
  says "Isi Data" any more. The route stays `/member/isi-data` on purpose —
  moving it would break `?next=` redirects, existing links and Plan 07c's
  draft handoff for no user-visible gain.
- ~~**Editing "Email Aktif" on the Profile page silently pre-authorizes a
  new login**~~ — **closed 2026-08-05 by locking the field.** "Email Aktif"
  is now display-only in the form, with a note saying why, and
  `submitJoinData` re-derives it from the session instead of trusting
  `input` — the server side being the actual fix, since the action takes
  direct POSTs. Consequence: **this form's** `createPendingInvite` call can
  now only ever see an address that already belongs to a `User`, so it
  always returns `existing-user` and does nothing. That is this call site
  only — `createPendingInvite` itself remains the live path by which members
  get invited, from the leader-driven **Add Member** form
  (`src/app/member/admin/add-member/actions.ts`, Plan 02c). The public
  `/join` form has never called it: it creates an `Applicant` row and
  nothing else, deliberately. **Still open:** whether the Profile form
  should pre-authorize anything at all. That one call is dead as written —
  worth either deleting or giving a real purpose, but it's a decision about
  invite semantics, not something to settle in a checklist restructure. The
  original problem, for the record: `submitJoinData`
  (`src/app/member/isi-data/actions.ts`) calls `createPendingInvite` with
  whatever `activeEmail` the member typed, recruited by the chosen
  "Pengundang / Unit" leader. `PendingInvite` **is** the allowlist, so if
  that address isn't already a `User`, saving the form pre-authorizes it —
  and whoever next signs into Google with it gets a **brand-new, separate
  agent account** under that leader. It does not move the member's own
  login: `User.email` is written once by the `on_auth_user_created` trigger
  from the Google identity and nothing in this path touches it. Nor does it
  move them in the tree — the only writes to `User.recruiterId` are
  `reassignRecruiter` in `src/lib/recruitTree.ts`. So the outcome is a
  duplicate person, not a hijacked account.

  It never fired in practice — `activeEmail` defaulted to the signed-in
  member's own address, so `createPendingInvite` returned `existing-user`
  and no-oped (verified 2026-08-05: the one real member's `activeEmail` and
  auth email matched). The behaviour predated the checklist restructure
  too. What made it worth closing was the reframing: it sat fine when this
  was a one-time onboarding step, but not once the same form became a
  **Profile page members revisit and edit**, where an edit to a contact
  field quietly minting an agent account is a surprising thing for it to
  do. Note the field stays editable on the public `/join` form — an
  applicant has no account to pin it to — so `TextField`'s `readOnly` is
  opt-in per field rather than global.
- **Marketing header nav is cramped on mobile** (`MarketingLayout`, Plan 01).
  The four nav links (Home / Join Us / DISC Test / Income Calculator) wrap and
  crowd the logo below ~400px wide — surfaced building Plan 03, left as-is
  since it's shared chrome, not that plan's scope. Wants a responsive
  treatment (hamburger/collapse). Still open after Plan 04: only three links
  are live so far (the calculator stays gated until Plan 05), which keeps it
  tolerable. Worth doing as its own small plan when `CALCULATOR_LIVE` flips
  and the fourth link comes back.
- ~~**Member sidebar is desktop-only**~~ — **resolved 2026-07-26** by Plan
  07's `MemberShell`. It was `hidden md:block`, leaving no way to reach a
  section on a phone except the dashboard's cards. The sidebar is now
  hide-able at both breakpoints: visible and collapsible on desktop, an
  overlay drawer with a dismiss scrim on mobile — the drawer option
  [spec.html](../design/spec.html) sketched, rather than the bottom tab bar
  in [spec-alt-member-nav.html](../design/spec-alt-member-nav.html). The
  marketing-header item above is still open; it's separate chrome.
- **`/join` embedded Google Form not verified for public access** (Plan 03).
  The iframe wiring works, but in a browser not signed into Google the embed
  showed Google's own sign-in prompt — unconfirmed whether that's just the
  test browser or the form's sharing settings requiring sign-in. Open the
  form's settings and confirm a logged-out visitor can view and submit it
  (this is a Google Form config check, not a code change). Moot once the form
  itself is rebuilt in-app, if that's ever scoped.
- **A pending invitee can't be anyone's recruiter yet** (Plan 02c). If A
  invites B and then wants to add C *under B* before B has signed in, there's
  no way to say so: B has no `User` row until first login, and
  `PendingInvite.recruiterId` points at `User.id`. The invite code doesn't
  help — that's `User.inviteCode`, which B also doesn't have yet. Today A
  either waits for B to sign in, or files C under themselves and moves them
  with `reassignRecruiter` afterwards. A real fix means letting an invite
  name another *invite* as recruiter, and having `on_auth_user_created`
  repoint those children when the parent invite is consumed — schema plus
  trigger work, worth its own small plan.
- **4 Starter Kit PDFs and 5 video/chat links have no real URL yet** (Plan
  07). The old `/hi-partner` and `/starter-kit` pages sit behind a
  Google-account gate, so this plan couldn't pull the actual files or links
  for the Starter Kit PDFs (Schedule Book, Project 100, Score Card, Review
  Polis), the 4 "Learn" videos, or the Telegram webinar-schedule link — the
  page ships with "Segera hadir" placeholders in
  `src/content/onboarding.ts` for all of them instead of fabricated URLs.
  Needs someone with access to the old site to pull the real files/links.

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
