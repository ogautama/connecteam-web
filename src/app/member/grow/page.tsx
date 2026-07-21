import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Grow — CONNECTeam",
};

export default function GrowPage() {
  return (
    <SectionPlaceholder
      title="Grow"
      summary="Recruiting kits and tools for bringing new partners into the business."
    />
  );
}
