# Plan 07 — Member: Get Started (onboarding)

## Status

**Done** in PR (pending). Shipped as described below. Notes on what the
implementation settled that the plan left open:

- **Content lives in `src/content/onboarding.ts`** as five typed exports
  (`KNOW_YOURSELF`/`LEARN_LINKS` links, `PLAN_YOUR_GOALS`/`JUST_DO_IT`
  checklists, `LEARN_VIDEOS` videos, `STARTER_KIT` downloads) rather than one
  combined shape — each section renders and validates differently (links
  always need a URL, videos/downloads don't yet).
- **Four items don't have real URLs yet, and this plan couldn't source
  them**: the "How Insurance Works" + 3 basics videos, the Telegram link,
  and all 4 Starter Kit PDFs. The old Google Sites pages sit behind a
  Google-account gate the agent can't authenticate through, and the plan doc
  itself only captured URLs for the Know Yourself links (DISC/MBTI/Self
  Motivation/profile upload), not these. Rather than fabricate links, the
  page renders a "Segera hadir" placeholder card for each and the Telegram
  ask becomes a text note pointing at the team leader instead of a dead
  link. **Follow-up needed**: supply the 4 PDFs (or their Drive URLs) for
  `STARTER_KIT`, the 4 video URLs for `LEARN_VIDEOS`, and the Telegram
  invite link — all in `src/content/onboarding.ts`.
- **DISC test link points at `/tools/disc`** (Plan 04, done) instead of the
  old external test, per the plan. MBTI/Self Motivation stay external
  (`satupersen.net`) since those aren't being rebuilt.
- **Recruitment Kit link points at `/member/grow`** (Plan 08, not yet
  built) — an internal route rather than the old Drive folder, since Plan 08
  owns that content going forward.
- Verified: `npm run lint`, `npx tsc --noEmit`, `npm test` all pass. Couldn't
  verify in a logged-in browser session — `/member/**` requires a real
  Google OAuth sign-in against the shared dev Supabase project, which this
  session doesn't have credentials for; confirmed instead that the route is
  correctly gated (redirects to `/login` when signed out) and relied on the
  page unit test, which renders the real component tree.

## Goal

`/member/onboarding` — merges the current *Hi Partner* and *Starter Kit*
pages into one new-agent onboarding hub.

## Depends on

Plan 06 (member shell/nav). Independent of Plans 08–14.

## Source content (from sites.google.com/view/connecteam)

**Hi Partner** (`/hi-partner`):
- Know Yourself: DISC test link (→ point at our own `/tools/disc` from
  Plan 04 instead of the external one), MBTI link
  (`satupersen.net/psikotes-online-gratis/tes-16-kepribadian`), Self
  Motivation link (`satupersen.net/psikotes-online-gratis/tes-self-motivation`),
  profile upload (`forms.gle/fcneonKgvAX5Wd1F6`).
- Plan Your Goals: checklist (list 20 potential business partners, list 20
  people who'll listen to your ideas, write 3-month personal goals).
- Learn Something New Today: "How Insurance Works in Real Life" YouTube
  video, 3 basics videos (Health/Critical Illness/Life Cover), link to
  Recruitment Kit content, Telegram link to ask for Welcoming New Agent
  webinar schedule.
- Just Do It: action checklist (bring 2 best partners, share a product you
  believe in, "Tell people: I'm PRU").

**Starter Kit** (`/starter-kit`): 4 downloadable PDFs — Schedule Book,
Project 100, Score Card, Review Polis.

## Scope

- Content module `src/content/onboarding.ts` structuring the above as
  typed sections (checklist items, external links, video embeds, PDF
  downloads).
- `/member/onboarding` page rendering: a step-by-step onboarding checklist
  (Know Yourself → Plan Your Goals → Learn → Just Do It) with our own DISC
  tool linked instead of the external one, followed by the Starter Kit
  downloads section.
- Re-host the 4 Starter Kit PDFs under `public/downloads/` (source files to
  be provided by you, or linked to their existing Drive URLs as a fallback
  if files aren't available yet).

## Unit tests

- Content module: schema validation (every link has a label + valid URL,
  every checklist has at least one item).
- Page: renders all four onboarding sub-sections and all 4 starter-kit
  downloads; DISC link points to `/tools/disc` (internal), not the old
  external URL.

## Verification

`npm run dev`, log in, visit `/member/onboarding`, click through each
link/download. `npm run lint`, `npx tsc --noEmit`, `npm test`.
