import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Reference Data — CONNECTeam",
};

export default function ReferencePage() {
  return (
    <SectionPlaceholder
      title="Reference Data"
      summary="Premium, medical, and prestige tables, organized by category."
    />
  );
}
