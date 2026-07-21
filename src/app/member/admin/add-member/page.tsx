import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listPendingInvitesFor, listRecruiterOptions } from "@/lib/invites";
import AddMemberForm from "./AddMemberForm";
import PendingInvites from "./PendingInvites";

export const metadata: Metadata = {
  title: "Add Member — CONNECTeam",
};

/**
 * The only way into the network through the UI (Plan 02c): a leader
 * pre-authorizes an email, and that person becomes a real User the moment
 * they sign in with Google. Leader-only — requireRole sends agents back to
 * /member before anything renders.
 */
export default async function AddMemberPage() {
  const leader = await requireRole("leader");
  const [recruiters, pendingInvites] = await Promise.all([
    listRecruiterOptions(),
    listPendingInvitesFor(leader.id),
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
    </div>
  );
}
