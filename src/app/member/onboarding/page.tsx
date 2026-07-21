import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Get Started — CONNECTeam",
};

export default function OnboardingPage() {
  return (
    <SectionPlaceholder
      title="Get Started"
      summary="Langkah pertama kamu sebagai agent baru — kenali diri sendiri, susun target, dan pelajari dasarnya."
    />
  );
}
