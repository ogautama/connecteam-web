import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getCompletedItemIds } from "@/lib/onboardingProgress";
import QuestHub from "./QuestHub";

export const metadata: Metadata = {
  title: "Get Started — CONNECTeam",
};

/**
 * Plan 07 (quest hub redesign) — only the Onboarding tab has real,
 * per-user-tracked content; Recruiting/Selling/Referensi/Kontak render as
 * placeholder shells inside QuestHub until their own plans land content.
 */
export default async function OnboardingPage() {
  const user = await requireMember();
  const completedItemIds = await getCompletedItemIds(user.id);

  return <QuestHub completedItemIds={completedItemIds} />;
}
