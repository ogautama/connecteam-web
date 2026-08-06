# Plan 19 — Profile page redesign (per-section editing)

## Status

**Proposed 2026-08-06.** Mockup approved:
[spec-profile-redesign.html](../design/spec-profile-redesign.html) (open in a
browser — before/after artboards, the edit states, and the masked-KTP detail).
Implementation starts once this plan merges.

## Goal

The Profile page (`/member/isi-data` when this plan was written,
`/member/profile` since 2026-08-06) renders saved data as a receipt: seventeen
label-left/value-right rows of identical weight, four links that all say
"Lihat file", an em-dash where "optional" should be, and one small underlined
"Ubah data" that reopens all sixteen inputs and five upload pickers to fix a
typo. Regroup the same seventeen values into an identity header plus three
labelled groups, each editable on its own — no new data, no schema change.

## Depends on

[Plan 07](07-member-onboarding.md) / [Plan 07c](07c-join-existing-member-linking.md)
— the Profile page and its `IntakeSummary` / `JoinDataForm` split as shipped.
Everything here is presentational plus client state; `submitJoinData` and the
`MemberIntake` schema are untouched.

## Decisions (made 2026-08-06, with the mockup)

- **Per-section editing.** Four groups, each with its own edit affordance:
  - *Nama & kontak* (the identity header) — name + phone. Email renders
    locked with the reason visible ("Email akun Google kamu — hubungi leader
    kalau perlu pindah"); the server already re-derives it from the session.
  - *Identitas* — No KTP, tempat/tanggal lahir, alamat.
  - *Pendidikan terakhir* — jenjang, sekolah, kota, tahun.
  - *Dokumen* — edits **per tile**, not per group: "Ganti" on a tile picks a
    file, uploads, saves. A group-level edit here would recreate the current
    problem at smaller scale.
- **No KTP is masked by default.** Last four digits + a "Lihat" toggle
  (client-side `useState` — the client already holds the value). The
  Identitas editor shows the full number, since editing requires it.
- **Pengundang / Unit is not editable — by anyone, from this page.** It
  renders as a read-only chip in the header with no edit path in any section,
  and section saves always send the stored value back unchanged. It resolves
  the member's leader and feeds `PendingInvite`, so changing it means
  re-parenting the member in the tree — not a profile edit.
- **First fill is unchanged.** A member with no `MemberIntake` row still gets
  the full one-question-per-card form (and the 07c draft handoff). Sections
  only appear once there's a saved record to edit.
- **Display-only mergers.** Tempat + tanggal lahir render as one field
  ("Ujung Pandang, 4 Juni 1981" — the way Indonesian forms write TTL) but
  split back into two inputs when edited. The title-only header card in
  `page.tsx` is absorbed into the identity header; the gradient brand bar
  moves onto it.

## Why per-section editing is cheap

The client (`IntakeForm`) already holds the whole saved record. A section
save sends the full `MemberIntakeInput` with only that group's fields swapped
in — every other value goes back unchanged, so all of `submitJoinData`'s
validation still passes (the untouched fields were valid when saved), and
`uploadIfNeeded` already passes existing storage keys through when no new
file was picked. The state change is one line:
`editing: boolean` → `editingSection: "kontak" | "identitas" | "pendidikan" | null`.

## Scope

- **`IntakeSummary`** (`src/components/forms/IntakeFormFields.tsx`) —
  restructured: identity header (monogram avatar, name, email · phone, unit
  chip, "Data lengkap" chip), then Identitas / Pendidikan / Dokumen cards.
  `SummaryRow` (label-left/value-right) is replaced by a label-above-value
  field in a two-column grid; `SummaryFileRow` by a document tile (icon,
  name, "Terupload" state, "Lihat · Ganti"). The optional spouse-KTP tile is
  dashed with "Opsional" + "Upload" — no more em-dash.
- **`JoinDataForm`** (`src/app/member/profile/JoinDataForm.tsx`) —
  `editingSection` state; per-section save handlers that merge the edited
  group into the saved record and call the existing `submitJoinData`;
  per-tile upload+save for documents.
- **`page.tsx`** (`src/app/member/profile/page.tsx`) — drop the title-only
  header card (the identity header takes the brand bar).
- **Masked KTP** — display component with a reveal toggle.
- The read-only accepted-application variant (07c) reuses the same layout
  with no edit affordances; its `note` moves under the header chips.
- Tests: update `profile/__tests__` for the new structure; add coverage for
  section-merge saves (untouched fields survive a section save) and the mask
  toggle.

## Watch out for

- **Last write wins.** Each save rewrites the whole row via
  `upsertMemberIntake`, so a second tab open since before the edit pushes
  stale values back. Accepted for now; narrowing the action to a partial
  update is optional follow-up work, not this plan.
- **Side effects per save.** Every `submitJoinData` call also runs
  `createPendingInvite` (a documented no-op at this call site — see the
  comment block in `actions.ts`) and `revalidatePath`. Three section saves
  fire them three times; harmless, but don't "fix" the invite call away —
  whether this form should invite at all is tracked in
  [00-overview.md](00-overview.md).
- **Avatar source.** The mockup draws a monogram. The uploaded selfie could
  fill it instead at the cost of a signed URL per render — decide during
  implementation, monogram is the safe default.

## Out of scope

- Any change to `submitJoinData`, `upsertMemberIntake`, or the
  `MemberIntake` schema (partial-update action included).
- An edit path for the 07c read-only accepted-application view.
- Editing Pengundang / Unit anywhere, for anyone.
