import Link from "next/link";
import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";

export const metadata: Metadata = {
  title: "Belum Terdaftar — CONNECTeam",
  description:
    "Akun Google kamu berhasil masuk, tapi email kamu belum terdaftar di CONNECTeam.",
};

// Landed on by a successful Google sign-in whose email has no matching
// PendingInvite/User row (see the on_auth_user_created trigger and
// src/proxy.ts) — distinct from /login so a real auth success doesn't read
// as a failed one. Copy is Bahasa to match /login, the step right before it.
export default function NotInvitedPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-display-sm font-bold tracking-tight text-ink-900">
          Kamu belum terdaftar
        </h1>
        <p className="max-w-md text-lg text-ink-500">
          Akun Google kamu berhasil masuk, tapi email kamu belum terdaftar di
          CONNECTeam. Minta leader kamu buat nambahin, lalu masuk lagi.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800"
        >
          Home
        </Link>
      </section>
    </MarketingLayout>
  );
}
