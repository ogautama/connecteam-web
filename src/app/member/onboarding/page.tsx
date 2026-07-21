import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Get Started — CONNECTeam",
};

export default function OnboardingPage() {
  return (
    <SectionPlaceholder
      title="Get Started"
      summary="Your first steps as a new agent — know yourself, plan your goals, and learn the basics."
    />
  );
}
