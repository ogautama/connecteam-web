# Plan 20 — Join Us redesign (profile look, one Kirim)

## Status

**Proposed 2026-08-06.** Mockup approved:
[spec-join-redesign.html](../design/spec-join-redesign.html) (open in a
browser — before/after artboards, the submit/error states, and the Jenjang
detail). Implementation starts once this plan merges.

## Goal

The public `/join` application still wears the pre-Plan-19 kit: sixteen
Google-Forms-style cards in a single column (~3,000px of scroll), fifteen
asterisks, five identical full-width dropzones, and a radio list for
Pengundang / Unit that grows with the leader roster. Regroup the same sixteen
questions into the five cards the Profile page ships since Plan 19 —
Nama & kontak, Identitas, Pendidikan, Dokumen, Pengundang / Unit — with **one
"Kirim aplikasi" button at the end**. Unlike Profile there are no per-card
saves: nothing exists server-side to save into until submit.

Also: add **Diploma (D1–D4)** to the education picklist, between
SMA / SLTA / SMK and S1.

## Depends on

[Plan 19](19-profile-redesign.md) — the group-card kit this reuses
(`EditField`, `EditInput`, `EditTextArea`, `EditSelect`, `DocTile`, all in
`src/components/forms/IntakeFormFields.tsx`).
[Plan 07c](07c-join-existing-member-linking.md) — the existing-member check
and `joinDraft` handoff, which stay exactly as they are.

## Decisions (made 2026-08-06, with the mockup)

- **Five group cards, all open at once.** Same components as Profile's edit
  state, but rendered as a form, not as per-section editors — no card-level
  "Simpan"/"Batal", no `editingSection` state. The submit flow
  (`checkExistingMember` → upload 5 files → `submitApplication`) is
  untouched.
- **One button, richer feedback.** Submit validates everything at once
  instead of returning the first error only:
  - each invalid field gets its own inline message;
  - the owning card gets a "N belum diisi" chip and error border;
  - a summary above the button names the offending sections and links to
    them ("3 hal masih kurang. Cek Identitas, Dokumen dan
    Pengundang / Unit."), and the page scrolls to the first.
  - While uploading, the button counts ("Mengupload 2 dari 5…") — five files
    ride one click, so the longest step should be legible.
- **Documents become tiles.** `DocTile` in a grid with a "0 dari 4 wajib"
  counter that ticks up as files are picked. Required tiles are dashed navy
  ("Pilih file"), the spouse KTP is dashed grey ("Opsional"). A picked tile
  shows the filename plus "Ganti · Hapus" — nothing uploads until Kirim.
- **Jenjang and Pengundang / Unit become selects.** Both radio stacks
  collapse into `EditSelect`. Pengundang keeps its helper line ("Nggak tahu?
  Pilih nama unit tempat kamu dengar soal CONNECTeam.") and shares the last
  card with the Kirim button, so "what's left" and "done" are the same
  stopping point.
- **Diploma (D1–D4)** joins `EDUCATION_OPTIONS` between SMA / SLTA / SMK and
  S1 — label exactly `Diploma (D1–D4)`, enum value `diploma`. Display order
  comes from the array, not the enum. This is a deliberate addition, not a
  transcription fix: the source Google Form never offered Diploma, so the
  picklist stops being a strict copy of the original form
  ([Plan 07](07-member-onboarding.md) transcribed it verbatim).
- **The header card earns its keep.** Same gradient-bar card, now also
  stating the cost up front — "4 bagian · 5 menit" chip — and the required
  rule once ("Semua kolom wajib diisi kecuali yang ditandai *opsional*")
  instead of fifteen asterisks.
- **Button sits at the end, not sticky.** Mobile sticky bar is possible
  follow-up, but it covers content on a long form; not this plan.
- **The member first-fill form does NOT follow in this pass.** Profile's
  pre-save branch (`JoinDataForm`'s question-card stack) keeps the old look
  for now — matching it is cheap once this lands, but it drags in the 07c
  draft-prefill and locked-email variants; tracked as follow-up, decided at
  next planning.

## Scope

- **`ApplicationForm.tsx`** (`src/app/join/ApplicationForm.tsx`) — the
  re-layout. Same `FormState`/`FileFields`/`handleSubmit` skeleton; the
  render swaps `QuestionCard`-per-field for the five group cards. New
  client-side validation pass producing per-field errors
  (`Record<field, string>`) plus the per-card counts and summary; scroll to
  first invalid on submit.
- **`page.tsx`** (`src/app/join/page.tsx`) — header card gains the
  "4 bagian · 5 menit" chip and the rewritten required-rule line.
- **`IntakeFormFields.tsx`** — two small extensions, both backwards
  compatible:
  - `DocTile` learns a pending-`File` state (filename in place of
    "Terupload", plus "Hapus" to un-pick) alongside the existing saved-`url`
    state;
  - `EditSelect` takes `options` as a prop instead of hardcoding
    `EDUCATION_OPTIONS` (Profile call sites pass `EDUCATION_OPTIONS`
    explicitly — no behavior change there).
- **Diploma:**
  - `prisma/schema.prisma` — `diploma` added to `enum EducationLevel`;
    migration `ALTER TYPE "EducationLevel" ADD VALUE 'diploma'` (additive,
    no backfill, no stored-row changes).
  - `src/lib/memberIntakeOptions.ts` — `{ value: "diploma", label:
    "Diploma (D1–D4)" }` inserted after SMA / SLTA / SMK. This single array
    feeds the Join form, the Profile Pendidikan editor, and
    `ApplicantQueue`'s label lookup — one edit, three screens.
- **Tests** — update `join/__tests__` for the new structure; add coverage
  for: all-at-once validation (multiple errors surface together, summary
  names the right sections), tile pick/replace/remove before submit, and
  `diploma` accepted end-to-end by `submitApplication`'s validation.

## Watch out for

- **`ALTER TYPE … ADD VALUE` and transactions.** Postgres can't add an enum
  value inside a transaction block in older versions, and the new value
  can't be *used* in the same transaction that adds it. Keep the migration
  to the single `ALTER TYPE` statement, nothing else in the file.
- **Migration ordering vs deploy.** The dev/staging Supabase is shared
  (staging reads the same DB) — apply the migration before or with the
  deploy that ships the option, or a submitted `diploma` value bounces off
  the old enum.
- **Server-side validation already passes.** `submitApplication` validates
  `education` against the Prisma enum, so once the enum knows `diploma`
  nothing else server-side changes. Don't add a parallel allowlist.
- **anon Storage rules still apply.** The tile UI changes when files upload,
  not how: `upsert: false` on the applicant bucket stays (anon has INSERT
  only, no SELECT — see the comment above the `upload` call in
  `ApplicationForm.tsx`).
- **Existing-member short-circuit.** `checkExistingMember` still runs before
  any upload and stashes the draft via `saveJoinDraft`; the new validation
  pass must run *before* it (don't burn the check on a form that can't
  submit anyway).

## Out of scope

- Any change to `submitApplication`, the `Applicant` schema (beyond the
  shared enum), or Storage policies.
- The member Profile first-fill form (`JoinDataForm`'s pre-save branch) —
  follow-up, see Decisions.
- A sticky mobile submit bar.
- Auto-invite on acceptance (explicitly decided against, Plan 07c era —
  unchanged).
