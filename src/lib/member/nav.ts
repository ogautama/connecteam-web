import type { Role } from "@prisma/client";

/**
 * The quest hub's sections. The sidebar *is* the section switcher (there's no
 * in-page tab strip) — each of these is a `?section=` value on
 * /member/onboarding, not its own route.
 */
export type HubSectionId =
  | "onboarding"
  | "recruiting"
  | "selling"
  | "calculator"
  | "references"
  | "contests"
  | "events"
  | "directory";

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
  /**
   * Open to everyone but holds leader-only items (Plan 13's Power Monday,
   * Plan 14's leader contact lines). The "Leaders" badge shows to leaders
   * only — to an agent it would advertise content they can't reach.
   */
  leaderExtras?: boolean;
  /** Nested beneath a parent in the sidebar (References' sub-sections). */
  children?: MemberNavItem[];
};

export const MEMBER_NAV: MemberNavItem[] = [
  { label: "Dashboard", href: "/member" },
  {
    label: "Onboarding",
    section: "onboarding",
    description: "Langkah pertama kamu sebagai agent baru",
  },
  {
    label: "Recruiting",
    section: "recruiting",
    description: "Kit rekrutmen dan alat ngajak partner",
  },
  {
    label: "Selling",
    section: "selling",
    description: "Katalog produk dan materi jualan",
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
        label: "Contests & Campaigns",
        section: "contests",
        description: "Yang lagi jalan sekarang",
      },
      {
        label: "Events",
        section: "events",
        description: "Acara buat diikutin dan ngajak prospek",
        leaderExtras: true,
      },
    ],
  },
  {
    label: "Directory",
    section: "directory",
    description: "Kontak siapa buat urusan apa",
    leaderExtras: true,
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

export function showsLeaderBadge(item: MemberNavItem, role: Role): boolean {
  return role === "leader" && Boolean(item.leaderOnly || item.leaderExtras);
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
