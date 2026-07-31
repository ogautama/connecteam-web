"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createPendingInvite, isValidEmail } from "@/lib/invites";
import {
  getMemberIntake,
  getPengundangUnitOptions,
  type MemberIntakeInput,
  type MemberIntakeRecord,
  resolvePengundangUnitLeaderId,
  upsertMemberIntake,
} from "@/lib/memberIntake";
import { setItemCompletion } from "@/lib/onboardingProgress";

/**
 * "Isi Data" — the personal-data intake form (Plan 07), fields copied from
 * the real Google Form it replaces. Submitting it also:
 *
 * - marks the "join-isi-data" checklist item done on the Onboarding hub, so
 *   there's no separate manual checkbox step once the real data is saved.
 * - pre-authorizes "Email Aktif" as an agent (a PendingInvite, same
 *   mechanism as the leader-driven "Add Member" flow, Plan 02c), recruited
 *   by whichever leader was picked as "Pengundang / Unit" — but only if
 *   that email isn't already a real User. In practice this is almost always
 *   a no-op, since Email Aktif defaults to (and is usually left as) the
 *   signed-in member's own address, and they're a User already; it only
 *   does something the rare time someone declares a different active email
 *   here. createPendingInvite already treats "existing-user" as a normal,
 *   silent outcome rather than an error, so this never blocks the intake
 *   save over it.
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
    activeEmail: input.activeEmail.trim(),
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
  const pengundangUnitOptions = await getPengundangUnitOptions();
  if (!pengundangUnitOptions.includes(trimmed.pengundangUnit)) {
    throw new Error("Pengundang / Unit wajib dipilih.");
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

  await upsertMemberIntake(user.id, trimmed);
  await setItemCompletion(user.id, "join-isi-data", true);

  const leaderId = await resolvePengundangUnitLeaderId(trimmed.pengundangUnit);
  if (leaderId) {
    await createPendingInvite({
      email: trimmed.activeEmail,
      recruiterId: leaderId,
      role: "agent",
      invitedBy: leaderId,
    });
  }

  revalidatePath("/member/onboarding");
  revalidatePath("/member/isi-data");

  // Re-read rather than assemble in place: photo fields need freshly signed
  // URLs (mirrors saveTestResultLead's "return the persisted state" shape in
  // ../onboarding/actions.ts), and the row we just upserted is guaranteed
  // to exist.
  return (await getMemberIntake(user.id))!;
}
