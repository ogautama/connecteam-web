import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Events — CONNECTeam",
};

export default function EventsPage() {
  return (
    <SectionPlaceholder
      title="Events"
      summary="Sessions to join, and the ones you invite prospects to."
    />
  );
}
