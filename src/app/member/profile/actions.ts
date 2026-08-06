"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createPendingInvite, isValidEmail } from "@/lib/invites";
import {
  getMemberIntake,
  getPengundangUnitForMember,
  getPengundangUnitOptions,
  type MemberIntakeInput,
  type MemberIntakeRecord,
  resolvePengundangUnitLeaderId,
  upsertMemberIntake,
} from "@/lib/memberIntake";

/**
 * The Profile page's intake form (Plan 07, route /member/profile since
 * 2026-08-06), fields copied from the real Google Form it replaces.
 *
 * **"Email Aktif" is not editable, by design.** It's the address on the
 * Google account the member signs in with, so changing it here would mean
 * changing who they are — and it used to mean more than that: this action
 * hands `activeEmail` to `createPendingInvite`, and PendingInvite *is* the
 * login allowlist. A member who typed an unfamiliar address into a contact
 * field would silently pre-authorize a brand-new agent account under their
 * "Pengundang / Unit" leader, i.e. a duplicate of themselves in the tree.
 * Tolerable when this was a one-time onboarding step; not when the same
 * form became a Profile page people revisit and edit.
 *
 * So the value is re-derived from the session below rather than trusted
 * from `input`. The form renders the field read-only too, but that's the
 * courtesy — this is the guard, since server actions take direct POSTs.
 * A consequence worth knowing: *this* `createPendingInvite` call can now
 * only ever see an address that already belongs to a User, so it always
 * returns "existing-user" and does nothing. That's this call site only —
 * `createPendingInvite` itself is alive and well, and is how members
 * actually get invited (the leader-driven Add Member form,
 * src/app/member/admin/add-member/actions.ts, Plan 02c). Don't read this
 * as permission to delete the function. The call is left here rather than
 * removed because whether this form should invite at all is its own
 * decision, tracked in docs/plans/00-overview.md.
 *
 * Photo fields carry storage keys the client already uploaded to the
 * member-intake bucket (mirrors saveTestResultLead in
 * ../onboarding/actions.ts) — the prefix check here is a sanity guard, not
 * the real gate; that's the bucket's RLS policy, enforced at upload time.
 */
export async function submitJoinData(
  input: MemberIntakeInput
): Promise<MemberIntakeRecord> {
  const user = await requireMember();

  const trimmed: MemberIntakeInput = {
    fullName: input.fullName.trim(),
    ktpNumber: input.ktpNumber.trim(),
    birthPlace: input.birthPlace.trim(),
    birthDate: input.birthDate.trim(),
    // Taken from the session, NOT from input — the field is display-only in
    // the form, and a server action is reachable by direct POST, so the UI
    // lock is a courtesy and this is the actual guard. See the note above.
    activeEmail: user.email,
    activePhone: input.activePhone.trim(),
    address: input.address.trim(),
    education: input.education,
    schoolName: input.schoolName.trim(),
    schoolCity: input.schoolCity.trim(),
    graduationYear: input.graduationYear.trim(),
    ktpPhotoKey: input.ktpPhotoKey,
    selfiePhotoKey: input.selfiePhotoKey,
    familyCardPhotoKey: input.familyCardPhotoKey,
    savingsPhotoKey: input.savingsPhotoKey,
    spousePhotoKey: input.spousePhotoKey,
    pengundangUnit: input.pengundangUnit,
  };

  if (!trimmed.fullName) throw new Error("Nama lengkap wajib diisi.");
  if (!trimmed.ktpNumber) throw new Error("Nomor KTP wajib diisi.");
  if (!trimmed.birthPlace) throw new Error("Tempat lahir wajib diisi.");
  if (!trimmed.birthDate || Number.isNaN(Date.parse(trimmed.birthDate))) {
    throw new Error("Tanggal lahir wajib diisi.");
  }
  if (!trimmed.activeEmail) throw new Error("Email aktif wajib diisi.");
  if (!isValidEmail(trimmed.activeEmail)) {
    throw new Error("Format email aktif belum bener.");
  }
  if (!trimmed.activePhone) throw new Error("No HP aktif wajib diisi.");
  if (!trimmed.address) throw new Error("Alamat domisili wajib diisi.");
  if (!trimmed.schoolName) throw new Error("Nama sekolah/universitas wajib diisi.");
  if (!trimmed.schoolCity) throw new Error("Kota sekolah/universitas wajib diisi.");
  if (!trimmed.graduationYear) throw new Error("Tahun kelulusan wajib diisi.");

  // Like activeEmail above: when the member was invited via Add Member,
  // "Pengundang / Unit" is a fact of the tree (their recruiter's leader),
  // not something they get to pick — the form renders it locked, and this
  // re-derivation is the actual guard against a direct POST naming some
  // other unit. Only members with nothing to derive (no recruiter chain to
  // a leader) still answer for themselves, validated against the live list.
  const derivedUnit = await getPengundangUnitForMember(user.id);
  if (derivedUnit) {
    trimmed.pengundangUnit = derivedUnit;
  } else {
    const pengundangUnitOptions = await getPengundangUnitOptions();
    if (!pengundangUnitOptions.includes(trimmed.pengundangUnit)) {
      throw new Error("Pengundang / Unit wajib dipilih.");
    }
  }

  for (const [key, label] of [
    ["ktpPhotoKey", "Foto KTP"],
    ["selfiePhotoKey", "Foto Selfie"],
    ["familyCardPhotoKey", "Kartu Keluarga"],
    ["savingsPhotoKey", "Foto buku tabungan/rekening koran"],
  ] as const) {
    const path = trimmed[key];
    if (!path || !path.startsWith(`${user.id}/`)) {
      throw new Error(`${label} belum berhasil diupload.`);
    }
  }
  if (trimmed.spousePhotoKey && !trimmed.spousePhotoKey.startsWith(`${user.id}/`)) {
    throw new Error("Foto KTP Pasangan belum berhasil diupload.");
  }

  // No checklist write here any more: "join-isi-data" left
  // ONBOARDING_SECTIONS on 2026-08-05, so a progress row for it can never be
  // rendered again. Writing one would just re-create the dead state the
  // accompanying migration deletes.
  await upsertMemberIntake(user.id, trimmed);

  const leaderId = await resolvePengundangUnitLeaderId(trimmed.pengundangUnit);
  if (leaderId) {
    await createPendingInvite({
      email: trimmed.activeEmail,
      recruiterId: leaderId,
      role: "agent",
      invitedBy: leaderId,
    });
  }

  revalidatePath("/member/profile");

  // Re-read rather than assemble in place: photo fields need freshly signed
  // URLs (mirrors saveTestResultLead's "return the persisted state" shape in
  // ../onboarding/actions.ts), and the row we just upserted is guaranteed
  // to exist.
  return (await getMemberIntake(user.id))!;
}
