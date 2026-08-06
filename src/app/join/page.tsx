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
 * follow-on: a public application form, no account needed. The same 16
 * questions as the member Profile form, and since Plan 20 the same
 * five-group-card look too (@/components/forms/IntakeFormFields,
 * ApplicationForm.tsx) — one "Kirim aplikasi" at the end instead of
 * Profile's per-section saves. No member sidebar (MarketingLayout instead
 * of MemberShell) and no auth gate — submitApplication (./actions.ts) is
 * reachable by anyone. Submissions land in a leader's review queue
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
            {/* The cost up front, and the required rule once — the form
                itself carries no asterisks (Plan 20: all but one field is
                required, so marking the norm said nothing). */}
            <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-ink-100 pt-3 text-sm text-ink-500">
              <span className="rounded-full border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-500">
                5 bagian · 5 menit
              </span>
              Semua kolom wajib diisi kecuali yang ditandai opsional.
            </p>
          </div>
        </div>
        <ApplicationForm pengundangUnitOptions={pengundangUnitOptions} />
      </section>
    </MarketingLayout>
  );
}
