# Plan 17 — MBTI / Self Motivation result upload

## Status

**Done.** Shipped as described below.

## Goal

Plan 04 kept the MBTI and Self Motivation tests as plain external links to
`satupersen.net` (see its "Out of scope" note) — there was no in-house
version to build, and still isn't one here. What was missing is any record
of the result: a member takes the test on a 3rd-party site and the app never
finds out. This plan adds a lightweight in-app "prove you did it" step next
to those two links in the Onboarding hub's "Kenali Dirimu" section: screenshot
the result page, upload it, and type a short summary.

## Depends on

[Plan 07](07-member-onboarding.md) — the Onboarding hub / Know Yourself
section this attaches to. Reuses `Lead`/`createLead()` from
[Plan 02b](02b-supabase-auth-google-oauth.md)'s DISC lead-capture pattern
([Plan 04](04-disc-tool.md)).

## Decision: typed summary, not OCR

The obvious "make it structured" move is extracting the result from the
screenshot automatically. Rejected for now — this repo has no OCR/vision
pipeline, and `satupersen.net`'s result pages aren't a format we control or
can guarantee stays stable. Instead the member types their own result
(e.g. `INFJ-A`, a motivation score) in a plain text field alongside the
upload. The screenshot is still required and stored, as the backing
evidence — just not the thing that gets parsed for display.

## Scope

- **`LeadSource`** gains `mbti` and `selfMotivation` (`prisma/schema.prisma`,
  migration `20260727044848_add_mbti_self_motivation_lead_sources`). Same
  `Lead` table as DISC — `inputs: { typed }`, `result: { storagePath }`, no
  new model.
- **Supabase Storage**: a new private bucket, `test-results`, created in the
  same migration (`insert into storage.buckets`, since that table lives in
  the same Postgres database Prisma already migrates). One RLS policy scopes
  every operation to `<own userId>/...` via `auth.uid()` — the browser
  uploads directly to Storage, so that policy is the actual write gate, not
  a server action. This is the first thing in the codebase to use Supabase
  Storage; no bucket or policy existed before.
- Path convention: `<userId>/<mbti|selfMotivation>.<ext>` — one current file
  per member per test, overwritten (`upsert: true`) on re-upload.
- `src/lib/testResults.ts` — bucket name, source type, path builder. Plain
  constants only (no server-only imports) so both the client uploader and
  server code can import it.
- `src/app/member/onboarding/TestResultUpload.tsx` — client component: file
  input (image, ≤5MB) + typed-result text field. Uploads straight to Storage
  via `createSupabaseBrowserClient()`, then calls the
  `saveTestResultLead` server action to record it. Shows a "Hasil: …" +
  "Lihat screenshot" (signed URL) card once saved, with a "Ganti hasil" to
  re-open the form.
- `saveTestResultLead` (`src/app/member/onboarding/actions.ts`) —
  `requireMember()`-gated, re-derives `name`/`contact` from the session
  (never trusts client-supplied identity), checks the storage path was
  actually written under the caller's own id, creates the `Lead` row, and
  returns a fresh signed URL for the just-uploaded file.
- `getTestResultState` (`src/app/member/onboarding/testResultState.ts`) —
  server-only: finds the member's latest `Lead` for a source (matched by
  `contact = user.email`, same convention DISC's auto-save already uses) and
  signs a URL for its screenshot. Called from `page.tsx` so the hub shows
  already-saved results on load.
- `KNOW_YOURSELF` entries for MBTI/Self Motivation get a `testSource` field
  and a note pointing at the upload step; `QuestHub`'s `know-yourself` case
  renders `TestResultUpload` beneath those two links instead of the plain
  `LinkListDetail`.

## Out of scope

- OCR/automatic extraction of the result from the screenshot (see decision
  above).
- Leader visibility into members' MBTI/Self Motivation results — no
  equivalent of [Plan 16](16-disc-lead-visibility.md) here yet. Leads land
  in the table but nothing surfaces them beyond the uploading member's own
  "already saved" card.
- Replacing the external test sites with in-house versions — still explicitly
  out of scope per Plan 04.
- Deleting a previously uploaded screenshot/result.

## Verification

- `npm run dev`, sign in as a member, open Onboarding → Kenali Dirimu, upload
  a screenshot + typed result for both MBTI and Self Motivation, confirm the
  saved card appears, "Lihat screenshot" opens the image, and reloading the
  page still shows the saved state.
- `npm run lint`, `npx tsc --noEmit`.
