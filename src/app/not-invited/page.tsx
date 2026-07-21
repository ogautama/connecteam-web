import Link from "next/link";
import MarketingLayout from "@/components/layouts/MarketingLayout";

// Landed on by a successful Google sign-in whose email has no matching
// PendingInvite/User row (see the on_auth_user_created trigger and
// src/proxy.ts) — distinct from /login so a real auth success doesn't read
// as a failed one.
export default function NotInvitedPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-display-sm font-bold tracking-tight text-ink-900">
          You haven&apos;t been added yet
        </h1>
        <p className="max-w-md text-lg text-ink-500">
          Your Google account signed in successfully, but no leader has
          added your email to CONNECTeam yet. Ask your leader to add you,
          then sign in again.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800"
        >
          Back to home
        </Link>
      </section>
    </MarketingLayout>
  );
}
