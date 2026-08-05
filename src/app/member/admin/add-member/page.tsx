import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listApplicantsFor } from "@/lib/applicant";
import { listPendingInvitesFor, listRecruiterOptionsFor } from "@/lib/invites";
import AddMemberForm from "./AddMemberForm";
import ApplicantQueue from "./ApplicantQueue";
import PendingInvites from "./PendingInvites";

export const metadata: Metadata = {
  title: "Add Member — CONNECTeam",
};

/**
 * The only way into the network through the UI (Plan 02c): a leader
 * pre-authorizes an email, and that person becomes a real User the moment
 * they sign in with Google. Leader-only — requireRole sends agents back to
 * /member before anything renders.
 *
 * Also where the public /join application queue (Plan 15's follow-on,
 * built 2026-07-30) surfaces — reviewing an application doesn't create an
 * invite by itself, so "Terima" here and adding the member above are two
 * separate, deliberate steps.
 */
export default async function AddMemberPage() {
  const leader = await requireRole("leader");
  const [recruiters, pendingInvites, applicants] = await Promise.all([
    listRecruiterOptionsFor(leader.id),
    listPendingInvitesFor(leader.id),
    listApplicantsFor(leader.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Add Member
        </h1>
        <p className="mt-1 text-ink-500">
          Daftarin email calon anggota di sini dulu. Tanpa itu dia nggak bisa
          masuk sama sekali, walaupun punya akun Google.
        </p>
      </div>

      <AddMemberForm recruiters={recruiters} defaultRecruiterId={leader.id} />

      <PendingInvites invites={pendingInvites} />

      <ApplicantQueue applicants={applicants} />
    </div>
  );
}
