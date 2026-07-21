import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";

export const metadata: Metadata = {
  title: "Gabung — CONNECTeam",
  description:
    "Daftar jadi bagian dari CONNECTeam. Isi form pendaftaran dan tim kami akan menghubungi kamu.",
};

// The existing Google Form, embedded as-is. Rebuilding the form itself is
// out of scope for Plan 03 — this page just wraps it in the marketing shell.
const FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdogN_R3VKMZgt4ifQMOH3oNu2nYMiwrGWPuYZH5yTKqzUJkA/viewform?embedded=true";

export default function JoinPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto flex w-full max-w-content flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-display-sm font-bold tracking-tight text-ink-900">
          Gabung CONNECTeam
        </h1>
        <p className="max-w-xl text-lg text-ink-500">
          Isi form di bawah ini. Butuh sekitar 5 menit — setelah itu tim kami
          bakal menghubungi kamu buat ngobrol soal langkah selanjutnya.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <iframe
          title="Form pendaftaran CONNECTeam"
          src={FORM_EMBED_URL}
          className="h-[80vh] w-full rounded-2xl border border-ink-100"
        >
          Memuat form…{" "}
          <a href={FORM_EMBED_URL} target="_blank" rel="noopener noreferrer">
            Buka form pendaftaran
          </a>
        </iframe>
      </section>
    </MarketingLayout>
  );
}
