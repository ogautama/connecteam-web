import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getAcceptedApplicantByEmail } from "@/lib/applicant";
import {
  getMemberIntake,
  getPengundangUnitForMember,
  getPengundangUnitOptions,
} from "@/lib/memberIntake";
import JoinDataForm from "./JoinDataForm";

export const metadata: Metadata = {
  title: "Profile — CONNECTeam",
};

/**
 * Its own full page rather than an Onboarding accordion item — the form has
 * 16 fields including 5 photo uploads, far too much for an accordion detail.
 * Reached from "Profile" in the account dropdown (AccountMenu.tsx) since
 * 2026-08-05, when it left the Onboarding checklist for good: this is
 * personal data a member comes back to, not a one-time onboarding step.
 * Renamed "Isi Data" → "Profile" to match that menu item, and the route
 * followed on 2026-08-06. /member/isi-data 308s here (next.config.ts) so
 * existing links, `?next=` redirects and Plan 07c's draft handoff keep
 * working.
 *
 * Capped at 640px and one question per card (JoinDataForm) rather than the
 * app's usual max-w-content — a Google-Forms-style layout the user asked
 * for after the first version read as one crowded box.
 *
 * If this member already has an *accepted* /join application under the
 * same email, JoinDataForm shows that read-only instead of a blank form
 * (2026-07-30) — no need to fill the same data twice. Read-only only: the
 * user explicitly deferred building an edit path for that case.
 *
 * No title-only header card here any more (Plan 19, 2026-08-06): once a
 * MemberIntake row exists, the identity header JoinDataForm renders for it
 * carries the brand bar and the page's heading duty (name, not "Profile" —
 * the account menu already said that to get here). The first-fill form and
 * the read-only accepted-application view have no header of their own, same
 * as before.
 */
export default async function ProfilePage() {
  const user = await requireMember();
  const [saved, pengundangUnitOptions, recruiterUnit] = await Promise.all([
    getMemberIntake(user.id),
    getPengundangUnitOptions(),
    // A member invited via Add Member already sits under a leader — their
    // Pengundang / Unit is that leader's name, shown locked instead of
    // asked (the action re-derives it server-side too). Null falls back to
    // the select.
    getPengundangUnitForMember(user.id),
  ]);
  // Only worth looking up when there's nothing saved yet — an existing
  // MemberIntake row always wins, so a matched application would never be
  // shown anyway.
  const linkedApplication = saved ? null : await getAcceptedApplicantByEmail(user.email);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      <h1 className="sr-only">Profile</h1>
      <JoinDataForm
        userId={user.id}
        defaultEmail={user.email}
        initial={saved}
        pengundangUnitOptions={pengundangUnitOptions}
        recruiterUnit={recruiterUnit}
        linkedApplication={linkedApplication}
      />
    </div>
  );
}
