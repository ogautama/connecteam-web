"use server";

import { revalidatePath } from "next/cache";
import { createApplicant, type ApplicantInput } from "@/lib/applicant";
import { isValidEmail } from "@/lib/invites";
import { resolvePengundangUnitLeaderId } from "@/lib/memberIntake";

/**
 * The public "Join Us" application (Plan 15's deferred follow-on plan,
 * built 2026-07-30) — deliberately NOT behind requireMember(). Anyone can
 * call this, which is the point: it's how someone becomes an Applicant
 * before they have any account at all.
 *
 * Unlike submitJoinData (the member "Isi Data" form), this does NOT create
 * a PendingInvite — the user chose to keep account creation a manual step
 * for the leader (via the existing Add Member form) rather than
 * auto-inviting straight from an unreviewed public submission.
 */
export async function submitApplication(input: ApplicantInput): Promise<void> {
  const trimmed: ApplicantInput = {
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

  const recruiterId = await resolvePengundangUnitLeaderId(trimmed.pengundangUnit);
  if (!recruiterId) {
    throw new Error("Pengundang / Unit wajib dipilih.");
  }

  // No per-submitter identity to check photo keys against (there's no
  // userId) — the sanity check here is that every uploaded file landed
  // under the same one-time submission prefix the client generated, so one
  // submission's files can't get silently mixed up with another's.
  const requiredKeys: { key: keyof ApplicantInput; label: string }[] = [
    { key: "ktpPhotoKey", label: "Foto KTP" },
    { key: "selfiePhotoKey", label: "Foto Selfie" },
    { key: "familyCardPhotoKey", label: "Kartu Keluarga" },
    { key: "savingsPhotoKey", label: "Foto buku tabungan/rekening koran" },
  ];
  const prefix = (trimmed.ktpPhotoKey.split("/")[0] ?? "");
  if (!prefix) throw new Error("Foto KTP belum berhasil diupload.");
  for (const { key, label } of requiredKeys) {
    const value = trimmed[key];
    if (typeof value !== "string" || !value || !value.startsWith(`${prefix}/`)) {
      throw new Error(`${label} belum berhasil diupload.`);
    }
  }
  if (trimmed.spousePhotoKey && !trimmed.spousePhotoKey.startsWith(`${prefix}/`)) {
    throw new Error("Foto KTP Pasangan belum berhasil diupload.");
  }

  await createApplicant(recruiterId, trimmed);
  revalidatePath("/member/admin/add-member");
}
