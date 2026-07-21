import type { Role } from "@prisma/client";

export type MemberNavItem = {
  href: string;
  label: string;
  /** One-liner for the dashboard quick-link cards; the nav shows labels only. */
  description?: string;
  /**
   * Whole section is leader-only — hidden outright from agents. Nothing is
   * marked this way today; gating currently happens at the item level
   * *inside* a section (Plans 13/14), which is what `leaderExtras` covers.
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
    description: "Your first steps as a new agent",
  },
  {
    href: "/member/grow",
    label: "Grow",
    description: "Recruiting kits and partner tools",
  },
  {
    href: "/member/sell",
    label: "Sell",
    description: "Product catalog and sales material",
  },
  {
    href: "/member/reference",
    label: "Reference Data",
    description: "Premium, medical, and prestige tables",
  },
  {
    href: "/member/systems",
    label: "Official Systems",
    description: "PRUForce, licensing, claims, PayLink",
  },
  {
    href: "/member/contests",
    label: "Contests & Campaigns",
    description: "What's running right now",
  },
  {
    href: "/member/events",
    label: "Events",
    description: "Sessions to join and invite to",
    leaderExtras: true,
  },
  {
    href: "/member/directory",
    label: "Directory",
    description: "Who to contact for what",
    leaderExtras: true,
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
