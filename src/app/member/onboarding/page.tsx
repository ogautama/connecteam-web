import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { DEFAULT_SECTION, isValidSection } from "@/lib/member/nav";
import { getCompletedItemIds } from "@/lib/onboardingProgress";
import QuestHub from "./QuestHub";

export const metadata: Metadata = {
  title: "Member Space — CONNECTeam",
};

/**
 * The whole member space lives here — the sidebar switches sections via
 * `?section=` rather than navigating between routes. Only Onboarding has real
 * content so far; the rest render placeholder shells until their own plans
 * land content. An unknown/absent section falls back to Onboarding rather
 * than 404ing, since the value comes from a hand-editable query string.
 */
export default async function MemberHubPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await requireMember();
  const { section } = await searchParams;
  const completedItemIds = await getCompletedItemIds(user.id);

  return (
    <QuestHub
      section={isValidSection(section) ? section : DEFAULT_SECTION}
      completedItemIds={completedItemIds}
    />
  );
}
