import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Official Systems — CONNECTeam",
};

export default function SystemsPage() {
  return (
    <SectionPlaceholder
      title="Official Systems"
      summary="PRUForce, licensing, PRU PayLink, and the claim process."
    />
  );
}
