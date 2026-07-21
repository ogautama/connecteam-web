import type { Metadata } from "next";
import SectionPlaceholder from "@/components/member/SectionPlaceholder";

export const metadata: Metadata = {
  title: "Official Systems — CONNECTeam",
};

export default function SystemsPage() {
  return (
    <SectionPlaceholder
      title="Official Systems"
      summary="PRUForce, lisensi AAJI/AASI, PRU PayLink, dan proses klaim."
    />
  );
}
