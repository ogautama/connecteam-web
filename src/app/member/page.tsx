import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MemberDashboard from "./MemberDashboard";

export const metadata: Metadata = {
  title: "Dashboard — CONNECTeam",
};

export default async function MemberDashboardPage() {
  const user = await requireMember();
  // CurrentUser doesn't carry inviteCode (Plan 16's referral card is the
  // only thing on this page that needs it) — a narrow select here instead
  // of widening the auth-layer type every /member/** render pays for.
  const { inviteCode } = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { inviteCode: true },
  });

  return <MemberDashboard user={user} inviteCode={inviteCode} />;
}
