import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Masuk — CONNECTeam",
  description: "Masuk ke member space CONNECTeam dengan akun Google kamu.",
};

/**
 * `?next=` is a generic post-login destination, forwarded to
 * /auth/callback (which validates it). /join uses it to send someone who
 * turns out to already be a member straight to /member/profile.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <MarketingLayout>
      <section className="mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="text-display-sm font-bold tracking-tight text-ink-900">
          Masuk ke Member Space
        </h1>
        <p className="max-w-md text-lg text-ink-500">
          Gunakan akun Google yang sudah didaftarkan leader kamu.
        </p>

        <LoginForm next={next} />
      </section>
    </MarketingLayout>
  );
}
