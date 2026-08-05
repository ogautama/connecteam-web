import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getAcceptedApplicantByEmail } from "@/lib/applicant";
import { getMemberIntake, getPengundangUnitOptions } from "@/lib/memberIntake";
import JoinDataForm from "./JoinDataForm";

export const metadata: Metadata = {
  title: "Isi Data — CONNECTeam",
};

/**
 * Its own full page rather than an Onboarding accordion item — the form has
 * 16 fields including 5 photo uploads, far too much for an accordion detail.
 * Reached from "Profile" in the account dropdown (AccountMenu.tsx) since
 * 2026-08-05, when it left the Onboarding checklist for good: this is
 * personal data a member comes back to, not a one-time onboarding step. The
 * page's own heading still reads "Isi Data" while the menu says "Profile" —
 * a known, accepted mismatch tracked in docs/plans/00-overview.md.
 *
 * Capped at 640px and one question per card (JoinDataForm) rather than the
 * app's usual max-w-content — a Google-Forms-style layout the user asked
 * for after the first version read as one crowded box.
 *
 * If this member already has an *accepted* /join application under the
 * same email, JoinDataForm shows that read-only instead of a blank form
 * (2026-07-30) — no need to fill the same data twice. Read-only only: the
 * user explicitly deferred building an edit path for that case.
 */
export default async function IsiDataPage() {
  const user = await requireMember();
  const [saved, pengundangUnitOptions] = await Promise.all([
    getMemberIntake(user.id),
    getPengundangUnitOptions(),
  ]);
  // Only worth looking up when there's nothing saved yet — an existing
  // MemberIntake row always wins, so a matched application would never be
  // shown anyway.
  const linkedApplication = saved ? null : await getAcceptedApplicantByEmail(user.email);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="h-2.5 bg-gradient-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Isi Data</h1>
          <p className="mt-2 text-ink-500">Lengkapi data pribadi buat proses join.</p>
          <p className="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-500">
            Kolom bertanda <span className="text-brand-red-500">*</span> wajib diisi.
          </p>
        </div>
      </div>
      <JoinDataForm
        userId={user.id}
        defaultEmail={user.email}
        initial={saved}
        pengundangUnitOptions={pengundangUnitOptions}
        linkedApplication={linkedApplication}
      />
    </div>
  );
}
