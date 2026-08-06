import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { DEFAULT_SECTION, isValidSection } from "@/lib/member/nav";
import { getCompletedItemIds } from "@/lib/onboardingProgress";
import QuestHub from "./QuestHub";
import { getTestResultState } from "./testResultState";

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
const NO_TEST_RESULTS = { mbti: null, selfMotivation: null };

/**
 * MBTI/Self Motivation results are read by exactly one thing: the Onboarding
 * checklist's "Kenali Dirimu" detail. Every other section is handed them and
 * throws them away — and they aren't cheap, since each is a Lead lookup plus
 * a Supabase Storage signed-URL round trip. Fetch them only when Onboarding
 * is what's actually rendering.
 */
async function loadTestResults(email: string) {
  const [mbti, selfMotivation] = await Promise.all([
    getTestResultState(email, "mbti"),
    getTestResultState(email, "selfMotivation"),
  ]);
  return { mbti, selfMotivation };
}

export default async function MemberHubPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await requireMember();
  const { section: raw } = await searchParams;
  const section = isValidSection(raw) ? raw : DEFAULT_SECTION;

  // The progress bar renders on every section, so completions are always
  // needed; the test results are not (see loadTestResults).
  const [completedItemIds, testResults] = await Promise.all([
    getCompletedItemIds(user.id),
    section === "onboarding" ? loadTestResults(user.email) : NO_TEST_RESULTS,
  ]);

  return (
    <QuestHub
      section={section}
      completedItemIds={completedItemIds}
      user={user}
      testResults={testResults}
    />
  );
}
