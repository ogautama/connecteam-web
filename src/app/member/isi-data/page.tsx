import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getMemberIntake, getPengundangUnitOptions } from "@/lib/memberIntake";
import JoinDataForm from "./JoinDataForm";

export const metadata: Metadata = {
  title: "Isi Data — CONNECTeam",
};

/**
 * Its own full page rather than an Onboarding accordion item — opened in a
 * new tab from the checklist so filling it out doesn't lose the member's
 * place in the hub. Submitting it marks "join-isi-data" done back there
 * (src/app/member/isi-data/actions.ts).
 *
 * Capped at 640px and one question per card (JoinDataForm) rather than the
 * app's usual max-w-content — a Google-Forms-style layout the user asked
 * for after the first version read as one crowded box.
 */
export default async function IsiDataPage() {
  const user = await requireMember();
  const [saved, pengundangUnitOptions] = await Promise.all([
    getMemberIntake(user.id),
    getPengundangUnitOptions(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <div className="h-2.5 bg-gradient-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Isi Data</h1>
          <p className="mt-2 text-ink-500">
            Lengkapi data pribadi buat proses join. Bagian ini otomatis kecentang di
            checklist Onboarding begitu tersimpan.
          </p>
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
      />
    </div>
  );
}
