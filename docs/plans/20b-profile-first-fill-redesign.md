# Plan 20b — Profile first-fill in the five group cards

## Status

**Implemented 2026-08-06**, same day as [Plan 20](20-join-redesign.md) — the
follow-up that plan deferred, pulled forward by the user right after PR #38
merged.

## Goal

The Profile page's *first fill* — an invited member (leader-added, nothing
beyond an email yet) with no `MemberIntake` row — still rendered the old
one-question-per-card stack after Plan 20 gave `/join` the five group cards.
That left it the odd path out: the same 16 questions in a different, longer
costume, one page away from the redesigned Profile it saves into. Give it
the same five cards and single **Simpan**.

The per-section edit flow for a *saved* record (Plan 19) is untouched — this
is only the pre-save branch of `JoinDataForm`.

## What's different from /join's ApplicationForm

- **Email renders locked** to the signed-in Google account (dashed readOnly
  input + lock note, same as the Profile kontak editor) — it's not a
  validation field, so kontak counts 2, not 3, and an empty submit reads
  "15 hal masih kurang", not 16.
- **No existing-member check** — they *are* the member. Validate → upload →
  `submitJoinData`.
- **Uploads keyed by userId** in the member-intake bucket with
  `upsert: true` (own files, overwrite on retry) — unlike /join's
  random-per-submission prefix with `upsert: false` (anon has no SELECT).
- **Button says "Simpan"** (it saves their profile, not an application), and
  success lands on the Plan 19 per-section view rather than a done screen.
- **The 07c draft handoff is unchanged** — a /join draft still seeds the
  form state and shows its banner above the cards; only the rendering under
  the banner changed.

## How

The pieces ApplicationForm built locally moved into the shared kit
(`src/components/forms/IntakeFormFields.tsx`) so both forms use one copy:
`FormCard` (step number, "N belum diisi" chip, scroll ref), `FieldError`,
`DocErrors`, `invalidInputClass`, plus `DOC_ICONS` and `LockIcon` exports.
ApplicationForm dropped its duplicates in the same change.

## Out of scope

- The read-only accepted-application view (07c) — still `IntakeSummary`
  with `editable=false`.
- Everything Plan 20 already listed: sticky mobile button, server actions,
  Storage policies, schema.
