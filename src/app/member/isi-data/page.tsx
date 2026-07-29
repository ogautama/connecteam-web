import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getMemberIntake } from "@/lib/memberIntake";
import JoinDataForm from "./JoinDataForm";

export const metadata: Metadata = {
  title: "Isi Data — CONNECTeam",
};

/**
 * Its own full page rather than an Onboarding accordion item — opened in a
 * new tab from the checklist so filling it out doesn't lose the member's
 * place in the hub. Submitting it marks "join-isi-data" done back there
 * (src/app/member/isi-data/actions.ts).
 */
export default async function IsiDataPage() {
  const user = await requireMember();
  const saved = await getMemberIntake(user.id);

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Isi Data</h1>
        <p className="mt-1 text-ink-500">
          Lengkapi data pribadi buat proses join. Bagian ini otomatis kecentang di
          checklist Onboarding begitu tersimpan.
        </p>
      </div>
      <JoinDataForm userId={user.id} defaultEmail={user.email} initial={saved} />
    </div>
  );
}
