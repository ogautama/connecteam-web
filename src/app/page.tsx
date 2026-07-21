import Link from "next/link";
import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";
import { CALCULATOR_LIVE, DISC_LIVE } from "@/lib/features";

export const metadata: Metadata = {
  title: "CONNECTeam — Kerja Gak Harus Ribet",
  description:
    "Bangun karier bareng CONNECTeam: mentor beneran, jenjang cepat, skill digital, dan lingkungan yang positif. Agency muda di bawah Prudential Indonesia.",
};

// Four value pillars — the "why join" of the old Google Sites scroll,
// rethought into scannable cards.
const PILLARS = [
  {
    title: "Mentor Beneran",
    body: "Bukan ditinggal jalan sendiri. Ada leader yang nemenin dari nol sampai closing pertama kamu.",
  },
  {
    title: "Jenjang Cepat",
    body: "Sistem karier yang jelas. Performa kamu yang nentuin naik levelnya, bukan lama-lamaan nunggu giliran.",
  },
  {
    title: "Skill Digital",
    body: "Belajar jualan modern — konten, personal branding, tools digital — yang kepake seumur hidup.",
  },
  {
    title: "Lingkungan Positif",
    body: "Tim anak muda yang saling dorong. Serius ngejar target, tapi tetap seru dijalaninnya.",
  },
];

// Proof section — the stats + testimonials that carried the old landing page.
const STATS = [
  { value: "200+", label: "agen aktif" },
  { value: "85%", label: "tetap bertahan di tahun pertama" },
  { value: "#1", label: "agency muda di jaringan MRT Group" },
];

const TESTIMONIALS = [
  {
    quote:
      "Masuk sini nol pengalaman jualan. Setahun kemudian aku udah punya tim sendiri. Bedanya di mentor.",
    name: "Rizky",
    role: "Agent, gabung 2024",
  },
  {
    quote:
      "Kerjaan fleksibel, tapi bukan berarti santai. Aku belajar disiplin dan skill yang beneran kepake.",
    name: "Nabila",
    role: "Agent, gabung 2023",
  },
];

export default function Home() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-content flex-col items-center gap-6 px-6 py-24 text-center">
        <span className="rounded-full bg-brand-navy-50 px-4 py-1 text-sm font-medium text-brand-navy-700">
          Youth agency &times; Prudential Indonesia
        </span>
        <h1 className="max-w-3xl text-display-sm font-bold tracking-tight text-ink-900 sm:text-display-lg">
          Kerja Gak Harus{" "}
          <span className="bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 bg-clip-text text-transparent">
            Ribet
          </span>
        </h1>
        <p className="max-w-xl text-lg text-ink-500">
          Bangun karier di dunia asuransi bareng tim anak muda yang saling
          dukung. Ada mentor, ada sistem, ada jenjang yang jelas.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/join"
            className="rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800"
          >
            Gabung Sekarang
          </Link>
          {/* Hidden until the calculator exists (Plan 05) — see features.ts */}
          {CALCULATOR_LIVE && (
            <Link
              href="/tools/calculator"
              className="rounded-full border border-ink-100 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Hitung Potensi Income
            </Link>
          )}
        </div>
      </section>

      {/* Value pillars */}
      <section className="border-t border-ink-100 bg-ink-50">
        <div className="mx-auto w-full max-w-content px-6 py-20">
          <h2 className="text-center text-2xl font-bold text-ink-900">
            Kenapa Gabung CONNECTeam?
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-ink-100 bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-ink-900">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-ink-500">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof: stats + testimonials */}
      <section className="mx-auto w-full max-w-content px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="bg-linear-to-r from-brand-navy-700 to-brand-red-500 bg-clip-text text-4xl font-bold text-transparent">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-ink-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-ink-100 bg-white p-6"
            >
              <blockquote className="text-ink-700">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm font-medium text-ink-900">
                {t.name}{" "}
                <span className="font-normal text-ink-500">— {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="border-y border-ink-100 bg-brand-navy-700">
        <div className="mx-auto w-full max-w-content px-6 py-20 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-yellow-400">
            Visi Kami
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-2xl font-medium text-white">
            Melahirkan generasi muda yang mandiri secara finansial, sambil bantu
            lebih banyak keluarga Indonesia punya proteksi yang layak.
          </p>
        </div>
      </section>

      {/* DISC teaser — hidden until the DISC tool exists (Plan 04), see features.ts */}
      {DISC_LIVE && (
        <section className="mx-auto w-full max-w-content px-6 py-20">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-ink-100 bg-brand-yellow-50 p-8 sm:flex-row sm:text-left">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-ink-900">
                Kenalan sama dirimu dulu
              </h2>
              <p className="mt-2 max-w-md text-sm text-ink-500">
                Ikuti tes DISC gratis 2 menit dan cari tahu tipe kepribadianmu —
                plus gimana itu ngebentuk gaya kerjamu.
              </p>
            </div>
            <Link
              href="/tools/disc"
              className="shrink-0 rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800"
            >
              Mulai Tes DISC
            </Link>
          </div>
        </section>
      )}

      {/* Challenge / CTA */}
      <section className="border-t border-ink-100 bg-ink-50">
        <div className="mx-auto w-full max-w-content px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-ink-900">
            Siap ambil langkah pertama?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-500">
            Isi form pendaftaran sekarang. Tim kami bakal hubungi kamu buat
            ngobrol santai soal langkah selanjutnya.
          </p>
          <Link
            href="/join"
            className="mt-8 inline-block rounded-full bg-brand-red-500 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-red-600"
          >
            Gabung Sekarang
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
