import type { Role } from "@prisma/client";

export type MemberNavItem = {
  href: string;
  label: string;
  /**
   * One-liner for the dashboard quick-link cards; the nav shows labels only.
   * Section `label`s stay English (they're the IA, and match the design spec
   * + Plans 07–14); everything descriptive is Bahasa, like the public site.
   */
  description?: string;
  /**
   * Whole section is leader-only — hidden outright from agents. Add Member
   * (Plan 02c) is the only one today; gating otherwise happens at the item
   * level *inside* a section (Plans 13/14), which is what `leaderExtras`
   * covers.
   */
  leaderOnly?: boolean;
  /**
   * Section is open to everyone but holds leader-only items (Plan 13's
   * Power Monday, Plan 14's leader contact lines). The "Leaders" badge is
   * shown to leaders only — to an agent it would advertise content they
   * can't reach, which is worse than not mentioning it.
   */
  leaderExtras?: boolean;
};

export const MEMBER_NAV: MemberNavItem[] = [
  { href: "/member", label: "Dashboard" },
  {
    href: "/member/onboarding",
    label: "Get Started",
    description: "Langkah pertama kamu sebagai agent baru",
  },
  {
    href: "/member/grow",
    label: "Grow",
    description: "Kit rekrutmen dan alat ngajak partner",
  },
  {
    href: "/member/sell",
    label: "Sell",
    description: "Katalog produk dan materi jualan",
  },
  {
    href: "/member/reference",
    label: "Reference Data",
    description: "Tabel premi, medical, dan prestige",
  },
  {
    href: "/member/systems",
    label: "Official Systems",
    description: "PRUForce, lisensi, klaim, PayLink",
  },
  {
    href: "/member/contests",
    label: "Contests & Campaigns",
    description: "Yang lagi jalan sekarang",
  },
  {
    href: "/member/events",
    label: "Events",
    description: "Acara buat diikutin dan ngajak prospek",
    leaderExtras: true,
  },
  {
    href: "/member/directory",
    label: "Directory",
    description: "Kontak siapa buat urusan apa",
    leaderExtras: true,
  },
  // Not one of the eight IA sections — a leader-only tool, kept last so it
  // sits apart from them in both the nav and the dashboard cards.
  {
    href: "/member/admin/add-member",
    label: "Add Member",
    description: "Undang email anggota baru sebelum dia sign in",
    leaderOnly: true,
  },
];

export function filterForRole(
  items: MemberNavItem[],
  role: Role
): MemberNavItem[] {
  return items.filter((item) => !item.leaderOnly || role === "leader");
}

export function visibleNavItems(role: Role): MemberNavItem[] {
  return filterForRole(MEMBER_NAV, role);
}

export function showsLeaderBadge(item: MemberNavItem, role: Role): boolean {
  return role === "leader" && Boolean(item.leaderOnly || item.leaderExtras);
}

/**
 * Dashboard "Dashboard" isn't a section — everything after it is, and only
 * those get quick-link cards.
 */
export function memberSections(role: Role): MemberNavItem[] {
  return visibleNavItems(role).filter((item) => item.href !== "/member");
}

/**
 * `/member` only lights up on an exact match; every other section also owns
 * its sub-routes (e.g. `/member/sell/products`).
 */
export function isActiveNavItem(item: MemberNavItem, pathname: string): boolean {
  if (item.href === "/member") return pathname === "/member";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
