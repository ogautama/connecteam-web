import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";
import { getCurrentUser } from "@/lib/auth";
import { getPengundangUnitOptions } from "@/lib/memberIntake";
import ApplicationForm from "./ApplicationForm";

export const metadata: Metadata = {
  title: "Gabung — CONNECTeam",
  description:
    "Daftar jadi bagian dari CONNECTeam. Isi form pendaftaran dan tim kami akan menghubungi kamu.",
};

/**
 * Replaces Plan 03's Google Form embed (2026-07-30) — the real Plan 15
 * follow-on: a public application form, no account needed. Same
 * card-per-question look and the same 16 questions as the member "Isi
 * Data" form (@/components/forms/IntakeFormFields, ApplicationForm.tsx),
 * just without the member sidebar (MarketingLayout instead of MemberShell)
 * and with no auth gate — submitApplication (./actions.ts) is reachable by
 * anyone. Submissions land in a leader's review queue
 * (/member/admin/add-member) rather than auto-creating an account.
 */
export default async function JoinPage() {
  const [user, pengundangUnitOptions] = await Promise.all([
    getCurrentUser(),
    getPengundangUnitOptions(),
  ]);

  return (
    <MarketingLayout user={user}>
      <section className="mx-auto w-full max-w-[640px] px-6 pt-12 pb-24">
        <div className="mb-4 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="h-2.5 bg-gradient-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              Gabung CONNECTeam
            </h1>
            <p className="mt-2 text-ink-500">
              Isi form di bawah ini. Butuh sekitar 5 menit — tim kami bakal ngecek
              dan menghubungi kamu buat langkah selanjutnya.
            </p>
            <p className="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-500">
              Kolom bertanda <span className="text-brand-red-500">*</span> wajib diisi.
            </p>
          </div>
        </div>
        <ApplicationForm pengundangUnitOptions={pengundangUnitOptions} />
      </section>
    </MarketingLayout>
  );
}
