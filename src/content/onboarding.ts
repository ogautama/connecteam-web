// Content for /member/onboarding (Plan 07) — merges the old Google Sites
// "Hi Partner" and "Starter Kit" pages into one onboarding hub, structured as
// typed sections so the page and its schema test share the same shapes.

export type OnboardingLink = {
  label: string;
  href: string;
  note?: string;
};

export type OnboardingChecklist = {
  title: string;
  items: string[];
};

// Videos and downloads carried over from the old site whose actual
// file/URL wasn't captured in the content inventory this plan was written
// from (the source pages sit behind a Google-account gate). `href` stays
// undefined until a real one is supplied — the page shows a "segera hadir"
// state instead of a dead or fabricated link.
export type OnboardingVideo = {
  title: string;
  href?: string;
};

export type OnboardingDownload = {
  label: string;
  href?: string;
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
  },
  {
    label: "Tes Self Motivation",
    href: "https://satupersen.net/psikotes-online-gratis/tes-self-motivation",
  },
  {
    label: "Upload Profil",
    href: "https://forms.gle/fcneonKgvAX5Wd1F6",
    note: "Form singkat biar leadermu kenal kamu",
  },
];

export const PLAN_YOUR_GOALS: OnboardingChecklist = {
  title: "Susun Targetmu",
  items: [
    "Tulis 20 nama calon partner bisnis",
    "Tulis 20 nama orang yang bakal mau dengerin ide-idemu",
    "Tulis target pribadi buat 3 bulan ke depan",
  ],
};

export const LEARN_VIDEOS: OnboardingVideo[] = [
  { title: "Cara Kerja Asuransi di Kehidupan Nyata" },
  { title: "Dasar-Dasar: Health Cover" },
  { title: "Dasar-Dasar: Critical Illness Cover" },
  { title: "Dasar-Dasar: Life Cover" },
];

export const LEARN_LINKS: OnboardingLink[] = [
  {
    label: "Recruitment Kit",
    href: "/member/grow",
    note: "Materi buat ngajak partner baru",
  },
];

export const LEARN_NOTE =
  "Mau tau jadwal webinar Welcoming New Agent? Tanya leadermu di grup Telegram tim.";

export const JUST_DO_IT: OnboardingChecklist = {
  title: "Langsung Aksi",
  items: [
    "Ajak 2 partner terbaikmu ngobrol",
    "Share satu produk yang beneran kamu percaya",
    'Bilang ke orang-orang: "Saya PRU"',
  ],
};

export const STARTER_KIT: OnboardingDownload[] = [
  { label: "Schedule Book" },
  { label: "Project 100" },
  { label: "Score Card" },
  { label: "Review Polis" },
];
