import type { Metadata } from "next";
import MemberLayout from "@/components/layouts/MemberLayout";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Member Space — CONNECTeam",
};

/**
 * The in-page half of the `/member/**` gate. proxy.ts already rejects
 * unauthenticated and no-profile requests before they reach here; this layout
 * repeats the check because it's also where the session's user comes from —
 * and because a guard that only lives in the proxy is one matcher edit away
 * from silently not running.
 */
export default async function MemberSpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireMember();

  return <MemberLayout user={user}>{children}</MemberLayout>;
}
