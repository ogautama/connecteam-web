import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import MemberDashboard from "./MemberDashboard";

export const metadata: Metadata = {
  title: "Dashboard — CONNECTeam",
};

export default async function MemberDashboardPage() {
  const user = await requireMember();

  return <MemberDashboard user={user} />;
}
