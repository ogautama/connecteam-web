import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Directory — CONNECTeam",
};

export default function DirectoryPage() {
  return (
    <SectionPlaceholder
      title="Directory"
      summary="Kontak siapa buat urusan apa — CONNECTeam, MRT Group, dan Prudential."
    />
  );
}
