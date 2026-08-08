import { Suspense } from "react";
import type { Metadata } from "next";
import MarketingLayout from "@/components/layouts/MarketingLayout";
import { getCurrentUser } from "@/lib/auth";
import { getReferrerFirstName, getReferrerUnitName } from "@/lib/referrer";
import DiscTest from "./DiscTest";

export const metadata: Metadata = {
  title: "Tes DISC — CONNECTeam",
  description:
    "Tes kepribadian DISC gratis dari CONNECTeam. Kenali gaya kerjamu dalam 2 menit dan lihat gimana itu kepake di dunia penjualan dan rekrutmen.",
};

// Public page (also linked from /member/onboarding) — getCurrentUser() is a
// no-redirect lookup, so a signed-in member is recognized here without
// gating the page for anonymous visitors the way requireMember() would.
//
// No hero here any more (Plan 22): the intro belongs to the first of the
// three screens the client component owns, not above all 24 questions and
// the result.
export default async function DiscPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  // Display resolution only — `saveDiscLead` still resolves *ownership* from
  // the same code, server-side, on its own. A repeated `?ref=` gives an
  // array; a link that malformed doesn't get to name anyone.
  const ref = typeof params.ref === "string" ? params.ref : undefined;
  // The unit is for the share card only (Plan 23) — the page's own chrome
  // still names nobody but the referrer's first name.
  const [referrerName, referrerUnit] = await Promise.all([
    getReferrerFirstName(ref),
    getReferrerUnitName(ref),
  ]);

  return (
    <MarketingLayout user={user}>
      {/* useSearchParams (reading ?ref=) needs a Suspense boundary above it. */}
      <Suspense fallback={null}>
        <DiscTest
          user={user ? { name: user.name, email: user.email } : null}
          referrerName={referrerName}
          referrerUnit={referrerUnit}
        />
      </Suspense>
    </MarketingLayout>
  );
}
