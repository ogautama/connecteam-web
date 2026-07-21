import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Sell — CONNECTeam",
};

export default function SellPage() {
  return (
    <SectionPlaceholder
      title="Sell"
      summary="Katalog produk, sales kit, dan materi training yang kamu pakai buat jualan."
    />
  );
}
