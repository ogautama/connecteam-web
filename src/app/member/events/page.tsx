import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Events — CONNECTeam",
};

export default function EventsPage() {
  return (
    <SectionPlaceholder
      title="Events"
      summary="Acara buat kamu ikutin, dan yang bisa kamu ajak prospek ke sana."
    />
  );
}
