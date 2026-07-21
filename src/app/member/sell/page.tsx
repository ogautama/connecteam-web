import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Sell — CONNECTeam",
};

export default function SellPage() {
  return (
    <SectionPlaceholder
      title="Sell"
      summary="The product catalog, sales kit, and training material you sell with."
    />
  );
}
