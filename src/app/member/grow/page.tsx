import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Grow — CONNECTeam",
};

export default function GrowPage() {
  return (
    <SectionPlaceholder
      title="Grow"
      summary="Kit rekrutmen dan alat buat ngajak partner baru gabung ke bisnis ini."
    />
  );
}
