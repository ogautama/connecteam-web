import { Suspense } from "react";
import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";
import { DISC_QUESTIONS } from "@/lib/disc/questions";
import { getCurrentUser } from "@/lib/auth";
import DiscTest from "./DiscTest";

export const metadata: Metadata = {
  title: "Tes DISC — CONNECTeam",
  description:
    "Tes kepribadian DISC gratis dari CONNECTeam. Kenali gaya kerjamu dalam 2 menit dan lihat gimana itu kepake di dunia penjualan dan rekrutmen.",
};

// Public page (also linked from /member/onboarding) — getCurrentUser() is a
// no-redirect lookup, so a signed-in member is recognized here without
// gating the page for anonymous visitors the way requireMember() would.
export default async function DiscPage() {
  const user = await getCurrentUser();

  return (
    <MarketingLayout user={user}>
      <section className="mx-auto flex w-full max-w-content flex-col items-center gap-4 border-b border-ink-100 px-6 py-16 text-center">
        <span className="rounded-full bg-brand-yellow-100 px-4 py-1 text-sm font-medium text-brand-yellow-700">
          {`Gratis · ${DISC_QUESTIONS.length} pertanyaan · ~2 menit`}
        </span>
        <h1 className="max-w-2xl text-display-sm font-bold tracking-tight text-ink-900">
          Kenalan sama dirimu dulu
        </h1>
        <p className="max-w-xl text-lg text-ink-500">
          Gak ada jawaban benar atau salah. Pilih yang paling mirip sama kamu
          sehari-hari, dan kamu bakal lihat gaya kerjamu — plus gimana itu
          kepake buat jualan dan bangun tim.
        </p>
      </section>

      {/* useSearchParams (reading ?ref=) needs a Suspense boundary above it. */}
      <Suspense fallback={null}>
        <DiscTest user={user ? { name: user.name, email: user.email } : null} />
      </Suspense>
    </MarketingLayout>
  );
}
