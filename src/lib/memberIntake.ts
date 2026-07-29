import type { EducationLevel } from "@prisma/client";
import { MEMBER_INTAKE_BUCKET } from "@/lib/memberIntakeFiles";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type MemberIntakeInput = {
  fullName: string;
  ktpNumber: string;
  birthPlace: string;
  birthDate: string; // "YYYY-MM-DD", matches <input type="date">
  activeEmail: string;
  activePhone: string;
  address: string;
  education: EducationLevel;
  schoolName: string;
  graduationYear: string;
  /** Storage keys the client already uploaded to the member-intake bucket
   * (mirrors TestResultUpload's "upload first, then record the path"
   * pattern) — never raw file bytes. */
  ktpPhotoKey: string;
  selfiePhotoKey: string;
  familyCardPhotoKey: string;
  savingsPhotoKey: string;
  /** Only required "jika sudah berkeluarga" (if married) on the source form. */
  spousePhotoKey: string | null;
  pengundangUnit: string;
};

export type MemberIntakeRecord = MemberIntakeInput & {
  ktpPhotoUrl: string | null;
  selfiePhotoUrl: string | null;
  familyCardPhotoUrl: string | null;
  savingsPhotoUrl: string | null;
  spousePhotoUrl: string | null;
};

const SIGNED_URL_TTL_SECONDS = 60 * 10;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(MEMBER_INTAKE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function getMemberIntake(
  userId: string
): Promise<MemberIntakeRecord | null> {
  const row = await prisma.memberIntake.findUnique({ where: { userId } });
  if (!row) return null;

  const [ktpPhotoUrl, selfiePhotoUrl, familyCardPhotoUrl, savingsPhotoUrl, spousePhotoUrl] =
    await Promise.all([
      signedUrl(row.ktpPhotoKey),
      signedUrl(row.selfiePhotoKey),
      signedUrl(row.familyCardPhotoKey),
      signedUrl(row.savingsPhotoKey),
      signedUrl(row.spousePhotoKey),
    ]);

  return {
    fullName: row.fullName,
    ktpNumber: row.ktpNumber,
    birthPlace: row.birthPlace,
    birthDate: toDateOnly(row.birthDate),
    activeEmail: row.activeEmail,
    activePhone: row.activePhone,
    address: row.address,
    education: row.education,
    schoolName: row.schoolName,
    graduationYear: row.graduationYear,
    ktpPhotoKey: row.ktpPhotoKey,
    selfiePhotoKey: row.selfiePhotoKey,
    familyCardPhotoKey: row.familyCardPhotoKey,
    savingsPhotoKey: row.savingsPhotoKey,
    spousePhotoKey: row.spousePhotoKey,
    pengundangUnit: row.pengundangUnit,
    ktpPhotoUrl,
    selfiePhotoUrl,
    familyCardPhotoUrl,
    savingsPhotoUrl,
    spousePhotoUrl,
  };
}

export async function upsertMemberIntake(
  userId: string,
  input: MemberIntakeInput
): Promise<void> {
  const data = {
    fullName: input.fullName,
    ktpNumber: input.ktpNumber,
    birthPlace: input.birthPlace,
    birthDate: new Date(input.birthDate),
    activeEmail: input.activeEmail,
    activePhone: input.activePhone,
    address: input.address,
    education: input.education,
    schoolName: input.schoolName,
    graduationYear: input.graduationYear,
    ktpPhotoKey: input.ktpPhotoKey,
    selfiePhotoKey: input.selfiePhotoKey,
    familyCardPhotoKey: input.familyCardPhotoKey,
    savingsPhotoKey: input.savingsPhotoKey,
    spousePhotoKey: input.spousePhotoKey,
    pengundangUnit: input.pengundangUnit,
  };

  await prisma.memberIntake.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
