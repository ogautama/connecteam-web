import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Contests & Campaigns — CONNECTeam",
};

export default function ContestsPage() {
  return (
    <SectionPlaceholder
      title="Contests & Campaigns"
      summary="Yang lagi jalan sekarang, dan yang bakal datang."
    />
  );
}
