// Content for /member/onboarding (Plan 07) — merges the old Google Sites
// "Hi Partner" and "Starter Kit" pages into one onboarding hub, structured as
// typed sections so the page and its schema test share the same shapes.

export type OnboardingLink = {
  label: string;
  href: string;
  note?: string;
  /** Set for the two links whose result gets uploaded back in-app (Plan 17). */
  testSource?: "mbti" | "selfMotivation";
};

export const KNOW_YOURSELF: OnboardingLink[] = [
  {
    label: "Tes DISC",
    href: "/tools/disc",
    note: "Versi CONNECTeam sendiri — sekitar 2 menit",
  },
  {
    label: "Tes MBTI",
    href: "https://satupersen.net/psikotes-online-gratis/tes-16-kepribadian",
    note: "Tes di situs luar",
    testSource: "mbti",
  },
  {
    label: "Tes Self Motivation",
    href: "https://satupersen.net/psikotes-online-gratis/tes-self-motivation",
    note: "Tes di situs luar",
    testSource: "selfMotivation",
  },
];

// The onboarding checklist (rebuilt 2026-07-29 from the content-inventory
// sheet, Plan 07) — its 4 items are also Onboarding's sidebar children in
// spirit, but rendered inline here as accordion items rather than separate
// `?section=` pages. `id` is the opaque key OnboardingProgress rows key off
// of (prisma/schema.prisma) — stable once shipped, since renaming one loses
// members' existing checked-off state.
//
// Shrunk from 7 to 4 on 2026-08-05 (two separate calls, both recorded in
// 00-overview.md and mocked in design/spec-profile-menu.html):
// - "join-isi-data" left the checklist entirely — /member/isi-data is
//   personal data a member revisits, not a one-time step, so its entry
//   point moved to the "Profile" item in AccountMenu. The page itself is
//   unchanged; only where you find it moved.
// - "lisensi-aaji-aasi" and "kelas-mfc-sertifikasi" are hidden. Both were
//   empty "Segera hadir" placeholders. Note this is a specific call about
//   licensing/class content, NOT "hide every placeholder" —
//   "download-pruforce" and "setup-wa-ig" are just as empty and stay.
export type OnboardingSectionId =
  | "download-pruforce"
  | "know-yourself"
  | "goals-pribadi"
  | "setup-wa-ig";

export type OnboardingSection = {
  id: OnboardingSectionId;
  title: string;
  description: string;
  icon: string;
};

export const ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    id: "download-pruforce",
    title: "Download PruForce",
    description: "Unduh & install aplikasi PRUForce",
    icon: "📲",
  },
  {
    id: "know-yourself",
    title: "Kenali Dirimu",
    description: "Tes DISC, MBTI, Self Motivation",
    icon: "🧭",
  },
  {
    id: "goals-pribadi",
    title: "Bikin Goals Pribadi / Susun Targetmu",
    description: "Susun target jangka pendek, menengah, panjang",
    icon: "🎯",
  },
  {
    id: "setup-wa-ig",
    title: "Setup WA, IG",
    description: "Siapin WhatsApp & Instagram buat kerja",
    icon: "📱",
  },
];
