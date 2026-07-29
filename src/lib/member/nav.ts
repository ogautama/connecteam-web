import type { Role } from "@prisma/client";

/**
 * The quest hub's sections. The sidebar *is* the section switcher (there's no
 * in-page tab strip) — each of these is a `?section=` value on
 * /member/onboarding, not its own route.
 *
 * Rebuilt 2026-07-29 from the content-inventory sheet (Plan 07) — still
 * exactly two levels deep (top-level Section + one level of children); the
 * sheet's 3rd level ("Subcategory") becomes in-page sections instead of more
 * sidebar entries. Onboarding is a further exception: its own children don't
 * get `?section=` entries at all — they render as its existing accordion
 * checklist instead (see ONBOARDING_SECTIONS in @/content/onboarding).
 */
export type HubSectionId =
  | "onboarding"
  | "recruiting"
  | "recruiting-why"
  | "recruiting-bank-fast"
  | "recruiting-presentasi"
  | "recruiting-handling-obj"
  | "selling"
  | "selling-learning-center"
  | "selling-bank-form"
  | "selling-sales-tools"
  | "calculator"
  | "references"
  | "references-recording"
  | "references-commission"
  | "references-prestige"
  | "references-schedule-book"
  | "references-prupay-link"
  | "references-claim"
  | "references-contests"
  | "references-events"
  | "directory"
  | "directory-yellow-pages"
  | "directory-who-is-prudential"
  | "directory-who-is-mrt"
  | "directory-who-is-connecteam";

export const HUB_PATH = "/member/onboarding";
export const DEFAULT_SECTION: HubSectionId = "onboarding";

export type MemberNavItem = {
  label: string;
  /** Set for the sections that live inside the hub page. */
  section?: HubSectionId;
  /** Set for the items that are real, separate routes (dashboard, add member). */
  href?: string;
  /** One-liner for the dashboard quick-link cards; the nav shows labels only. */
  description?: string;
  /** Whole item is leader-only — hidden outright from agents. */
  leaderOnly?: boolean;
  /** Nested beneath a parent in the sidebar (one level only). */
  children?: MemberNavItem[];
};

export const MEMBER_NAV: MemberNavItem[] = [
  { label: "Dashboard", href: "/member" },
  // No sidebar children — its 7-item checklist (Join & Isi Data, Kenali
  // Dirimu, etc.) renders inline as accordion items on the page itself
  // (ONBOARDING_SECTIONS in @/content/onboarding), not as separate
  // `?section=` entries.
  {
    label: "Onboarding",
    section: "onboarding",
    description: "Langkah pertama kamu sebagai agent baru",
  },
  {
    label: "Recruiting",
    section: "recruiting",
    description: "Kit rekrutmen dan alat ngajak partner",
    children: [
      {
        label: "Kenapa recruit dlu?",
        section: "recruiting-why",
        description: "Alasan kenapa recruit duluan sebelum jualan",
      },
      {
        label: "Bank nama rekrut + FAST",
        section: "recruiting-bank-fast",
        description: "Kumpulin nama calon rekrut, FAST-score mereka",
      },
      {
        label: "Presentasi bisnis ke calon rekrut",
        section: "recruiting-presentasi",
        description: "Materi presentasi bisnis ke calon partner",
      },
      {
        label: "Handling Obj calon rekrut",
        section: "recruiting-handling-obj",
        description: "Jawaban buat keberatan umum calon rekrut",
      },
    ],
  },
  {
    label: "Selling",
    section: "selling",
    description: "Katalog produk dan materi jualan",
    children: [
      {
        label: "Learning Center",
        section: "selling-learning-center",
        description: "Video & materi belajar produk",
      },
      {
        label: "Bank nama rekrut + FORM",
        section: "selling-bank-form",
        description: "Kumpulin nama calon klien pakai FORM",
      },
      {
        label: "Sales Tools",
        section: "selling-sales-tools",
        description: "Tabel premi, medical, dan alat bantu jualan lain",
      },
    ],
  },
  {
    label: "Calculator",
    section: "calculator",
    description: "Hitung potensi income",
  },
  {
    label: "References",
    section: "references",
    description: "Tabel premi, medical, prestige, sistem resmi",
    children: [
      {
        label: "Recording",
        section: "references-recording",
        description: "Rekaman materi produk dan penjualan",
      },
      {
        label: "Commission",
        section: "references-commission",
        description: "Tabel skema komisi",
      },
      {
        label: "Prestige",
        section: "references-prestige",
        description: "Syarat dan reward program Prestige",
      },
      {
        label: "Schedule Book (PDF Download)",
        section: "references-schedule-book",
        description: "Unduh Schedule Book versi PDF",
      },
      {
        label: "Prupay Link",
        section: "references-prupay-link",
        description: "Link pembayaran resmi PRUPay",
      },
      {
        label: "Claim",
        section: "references-claim",
        description: "Cara klaim dan bukti klaim",
      },
      {
        label: "Contests & Campaigns",
        section: "references-contests",
        description: "Yang lagi jalan sekarang",
      },
      {
        label: "Events",
        section: "references-events",
        description: "Acara buat diikutin dan ngajak prospek",
      },
    ],
  },
  {
    label: "Directory",
    section: "directory",
    description: "Kontak siapa buat urusan apa",
    children: [
      {
        label: "Yellow Pages",
        section: "directory-yellow-pages",
        description: "Daftar kontak penting lintas tim",
      },
      {
        label: "Who is Prudential",
        section: "directory-who-is-prudential",
        description: "Kenalan sama Prudential Indonesia",
      },
      {
        label: "Who is MRT Group",
        section: "directory-who-is-mrt",
        description: "Kenalan sama MRT Group",
      },
      {
        label: "Who is Connecteam",
        section: "directory-who-is-connecteam",
        description: "Kenalan sama CONNECTeam",
      },
    ],
  },
  // Not a hub section — a leader-only tool on its own route, kept last so it
  // sits apart from the sections in both the nav and the dashboard cards.
  {
    label: "Add Member",
    href: "/member/admin/add-member",
    description: "Undang email anggota baru sebelum dia sign in",
    leaderOnly: true,
  },
];

/** The href a nav item points at — hub sections carry their `?section=`. */
export function navItemHref(item: MemberNavItem): string {
  if (item.href) return item.href;
  if (item.section === DEFAULT_SECTION) return HUB_PATH;
  return `${HUB_PATH}?section=${item.section}`;
}

function filterItem(item: MemberNavItem, role: Role): MemberNavItem | null {
  if (item.leaderOnly && role !== "leader") return null;
  if (!item.children) return item;

  const children = item.children
    .map((child) => filterItem(child, role))
    .filter((child): child is MemberNavItem => child !== null);

  return { ...item, children };
}

export function filterForRole(
  items: MemberNavItem[],
  role: Role
): MemberNavItem[] {
  return items
    .map((item) => filterItem(item, role))
    .filter((item): item is MemberNavItem => item !== null);
}

export function visibleNavItems(role: Role): MemberNavItem[] {
  return filterForRole(MEMBER_NAV, role);
}

/** Add Member is the only role-gated item left — Events/Directory lost their
 * leader-only filtering in the 2026-07-29 restructure. */
export function showsLeaderBadge(item: MemberNavItem, role: Role): boolean {
  return role === "leader" && Boolean(item.leaderOnly);
}

/**
 * "Dashboard" isn't a section — everything after it is, and only those get
 * quick-link cards. Nested children are flattened in so every section is
 * reachable from the dashboard, not just the top-level ones.
 */
export function memberSections(role: Role): MemberNavItem[] {
  return visibleNavItems(role)
    .filter((item) => item.href !== "/member")
    .flatMap((item) => [item, ...(item.children ?? [])]);
}

export function isValidSection(value: string | undefined): value is HubSectionId {
  // Guard the undefined case explicitly: the route-only items (Dashboard, Add
  // Member) carry `section: undefined`, so a bare `item.section === value`
  // would match undefined against undefined and wave a missing param through.
  if (value === undefined) return false;

  return MEMBER_NAV.flatMap((item) => [item, ...(item.children ?? [])]).some(
    (item) => item.section === value
  );
}

/**
 * `/member` only lights up on an exact match. Hub sections match on the
 * `section` param rather than the path, since they all share one route — and
 * a parent (References) does *not* light up for its children's sections, so
 * only one item ever reads as active.
 */
export function isActiveNavItem(
  item: MemberNavItem,
  pathname: string,
  section: HubSectionId
): boolean {
  if (item.section) return pathname === HUB_PATH && item.section === section;
  if (item.href === "/member") return pathname === "/member";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Whether `section` is `item` itself or lives under one of its children —
 * used to decide a collapsible parent's default open/closed state. */
export function sectionWithinItem(
  item: MemberNavItem,
  section: HubSectionId
): boolean {
  if (item.section === section) return true;
  return Boolean(item.children?.some((child) => child.section === section));
}
