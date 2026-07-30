import type { ApplicantStatus, EducationLevel } from "@prisma/client";
import { APPLICANT_INTAKE_BUCKET } from "@/lib/applicantFiles";
import { prisma } from "@/lib/prisma";
import { getDescendantUserIds } from "@/lib/recruitTree";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type ApplicantInput = {
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
  ktpPhotoKey: string;
  selfiePhotoKey: string;
  familyCardPhotoKey: string;
  savingsPhotoKey: string;
  spousePhotoKey: string | null;
  /** Not stored verbatim — resolved to a real User id at creation time, same
   * as submitJoinData does for the member form (src/lib/memberIntake.ts's
   * resolvePengundangUnitLeaderId). */
  pengundangUnit: string;
};

export type ApplicantSummary = {
  id: string;
  status: ApplicantStatus;
  createdAt: Date;
  fullName: string;
  activeEmail: string;
  activePhone: string;
  birthPlace: string;
  birthDate: string;
  address: string;
  education: EducationLevel;
  schoolName: string;
  graduationYear: string;
  recruiterName: string | null;
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
    .from(APPLICANT_INTAKE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export async function createApplicant(
  recruiterId: string,
  input: Omit<ApplicantInput, "pengundangUnit">
): Promise<void> {
  await prisma.applicant.create({
    data: {
      recruiterId,
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
    },
  });
}

/**
 * The review queue: every "submitted" application recruited under this
 * leader's own branch (themselves plus their whole downline) — same
 * branch-scoping convention as listPendingInvitesFor in src/lib/invites.ts.
 * Accepting/rejecting takes a row out of this list (mirrors PendingInvites'
 * "gone once handled" pattern), even though the row itself isn't deleted.
 */
export async function listApplicantsFor(
  leaderId: string
): Promise<ApplicantSummary[]> {
  const branchIds = await getDescendantUserIds(leaderId);

  const applicants = await prisma.applicant.findMany({
    where: { status: "submitted", recruiterId: { in: branchIds } },
    orderBy: { createdAt: "desc" },
    include: { recruiter: { select: { name: true } } },
  });

  return Promise.all(
    applicants.map(async (applicant) => ({
      id: applicant.id,
      status: applicant.status,
      createdAt: applicant.createdAt,
      fullName: applicant.fullName,
      activeEmail: applicant.activeEmail,
      activePhone: applicant.activePhone,
      birthPlace: applicant.birthPlace,
      birthDate: toDateOnly(applicant.birthDate),
      address: applicant.address,
      education: applicant.education,
      schoolName: applicant.schoolName,
      graduationYear: applicant.graduationYear,
      recruiterName: applicant.recruiter.name,
      ktpPhotoUrl: await signedUrl(applicant.ktpPhotoKey),
      selfiePhotoUrl: await signedUrl(applicant.selfiePhotoKey),
      familyCardPhotoUrl: await signedUrl(applicant.familyCardPhotoKey),
      savingsPhotoUrl: await signedUrl(applicant.savingsPhotoKey),
      spousePhotoUrl: await signedUrl(applicant.spousePhotoKey),
    })),
  );
}

/**
 * Leader-only, and only within their own branch — a leader can't reach into
 * another branch's applications any more than they can reassign a User
 * outside it (src/lib/recruitTree.ts's assertNoCycle guards the analogous
 * case there). Doesn't create a PendingInvite: accepting here is just a
 * record of the leader's decision — they still add the member manually via
 * the existing Add Member form, same as any other new member.
 */
export async function setApplicantStatus(
  leaderId: string,
  applicantId: string,
  status: Exclude<ApplicantStatus, "submitted">
): Promise<boolean> {
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { recruiterId: true },
  });
  if (!applicant) return false;

  const branchIds = await getDescendantUserIds(leaderId);
  if (!branchIds.includes(applicant.recruiterId)) return false;

  await prisma.applicant.update({ where: { id: applicantId }, data: { status } });
  return true;
}
