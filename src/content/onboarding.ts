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

// "Download PruForce" (Plan 11's PRUForce content, Onboarding half — Plan 11
// anticipated `src/content/systems.ts` splitting into an Onboarding-facing
// piece and a References-facing piece, and this is the Onboarding piece).
// Mocked in design/spec-pruforce.html, which sources every value below.
//
// Deliberately just three things: where to get it, how to install it, and
// what to do first if you're updating. The PRUForce Web Portal, PRUWorks and
// the PRUDigitalfriend helpdesk are Yellow Pages entries (Plan 14), not
// install steps.

/**
 * The one link. Not a store link and not the download files themselves:
 * PRUForce ships only through Prudential's agent portal (it is on neither
 * Google Play nor the App Store in Indonesia), and on that portal the Android
 * button is a signed GCS URL that expires after 7 days while the iOS one is
 * an `itms-services://` enterprise manifest. Both would rot; the portal page
 * does not. It needs no login.
 */
export const PRUFORCE_DOWNLOAD = {
  label: "Buka Halaman Download PRUForce",
  href: "https://portals.prudential.co.id/agent/application/view/68105c1e152990ce5bc2e7a6",
  note: "portals.prudential.co.id — portal resmi Prudential",
} as const;

export type PruForceInstallGuide = {
  platform: "android" | "ios";
  label: string;
  icon: string;
  steps: string[];
};

/**
 * Marked "perlu konfirmasi" in the UI on purpose. The shape of these steps
 * follows from what the portal's buttons actually are (an APK to side-load;
 * an enterprise OTA install Safari has to handle), but Plan 11 records real
 * iOS-popup troubleshooting copy on the old Google Sites page that nobody has
 * been able to read yet — it needs a login. Same honesty as the "Segera
 * hadir" tags: say what we don't know rather than sound sure.
 */
export const PRUFORCE_INSTALL: PruForceInstallGuide[] = [
  {
    platform: "android",
    label: "Android",
    icon: "🤖",
    steps: [
      "Buka halaman download, tap Unduh untuk Android.",
      "File .apk — bukan dari Play Store, jadi HP bakal nanya izin.",
      'Izinkan "Install dari sumber ini" buat browser kamu, lalu install.',
    ],
  },
  {
    platform: "ios",
    label: "iPhone / iPad",
    icon: "🍎",
    steps: [
      "Buka halaman download di Safari — di Chrome tombolnya nggak jalan.",
      "Tap Unduh untuk iOS, lalu Install di popup yang muncul.",
      "Setelan → Umum → VPN & Manajemen Perangkat → pilih Prudential → Percayai.",
    ],
  },
];

/** Paraphrased from Prudential's own "⚠️ DIGITAL UPDATE⚠️" notice on the
 * portal page. Lands people's drafts, so it stays loud. */
export const PRUFORCE_UPDATE_WARNING = {
  title: "Kalau kamu update dari versi lama:",
  points: [
    "SYNC DATA dan submit semua pengajuan dulu di versi lama.",
    "Draft yang dibuat di versi sebelumnya nggak bisa dilanjutin setelah update.",
    "Versi lama dinonaktifkan begitu versi baru rilis — nggak bisa nunda.",
  ],
} as const;

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
//   "download-pruforce" and "setup-wa-ig" were just as empty and stayed.
//   (That call paid off for the first of the two: "download-pruforce" has
//   had real content since 2026-08-05, see PRUFORCE_DOWNLOAD above.)
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
