import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Contests & Campaigns — CONNECTeam",
};

export default function ContestsPage() {
  return (
    <SectionPlaceholder
      title="Contests & Campaigns"
      summary="What's running right now, and what's coming up."
    />
  );
}
