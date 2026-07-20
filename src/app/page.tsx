import Link from "next/link";
import MarketingLayout from "@/components/layouts/MarketingLayout";

export default function Home() {
  return (
    <MarketingLayout>
      <section className="mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="max-w-2xl text-display-sm font-bold tracking-tight text-ink-900 sm:text-display-lg">
          Build a career with{" "}
          <span className="bg-linear-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400 bg-clip-text text-transparent">
            CONNECTeam
          </span>
        </h1>
        <p className="max-w-xl text-lg text-ink-500">
          A youth-led agency network built on Prudential Indonesia. This site
          is under construction — check back soon.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/join"
            className="rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800"
          >
            Join Us
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-ink-100 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            Member Login
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
