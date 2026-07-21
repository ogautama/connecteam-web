import { describe, expect, it } from "vitest";
import {
  MEMBER_NAV,
  filterForRole,
  isActiveNavItem,
  memberSections,
  showsLeaderBadge,
  visibleNavItems,
} from "@/lib/member/nav";

describe("visibleNavItems", () => {
  it("shows an agent the dashboard plus all 8 sections", () => {
    const labels = visibleNavItems("agent").map((item) => item.label);

    expect(labels).toEqual([
      "Dashboard",
      "Get Started",
      "Grow",
      "Sell",
      "Reference Data",
      "Official Systems",
      "Contests & Campaigns",
      "Events",
      "Directory",
    ]);
  });

  it("adds Add Member for a leader, and only for a leader", () => {
    expect(visibleNavItems("leader")).toHaveLength(MEMBER_NAV.length);
    expect(visibleNavItems("leader").map((item) => item.label)).toContain(
      "Add Member",
    );
    expect(visibleNavItems("agent").map((item) => item.label)).not.toContain(
      "Add Member",
    );
  });
});

describe("filterForRole", () => {
  const items = [
    { href: "/member/open", label: "Open" },
    { href: "/member/secret", label: "Secret", leaderOnly: true },
  ];

  it("hides a fully leader-only section from an agent", () => {
    expect(filterForRole(items, "agent").map((i) => i.label)).toEqual(["Open"]);
  });

  it("keeps it for a leader", () => {
    expect(filterForRole(items, "leader")).toHaveLength(2);
  });
});

describe("showsLeaderBadge", () => {
  const events = MEMBER_NAV.find((item) => item.href === "/member/events")!;
  const grow = MEMBER_NAV.find((item) => item.href === "/member/grow")!;

  it("badges a section holding leader-only items, for leaders", () => {
    expect(showsLeaderBadge(events, "leader")).toBe(true);
  });

  it("does not advertise it to agents", () => {
    expect(showsLeaderBadge(events, "agent")).toBe(false);
  });

  it("leaves sections with no leader-only content unbadged", () => {
    expect(showsLeaderBadge(grow, "leader")).toBe(false);
  });
});

describe("memberSections", () => {
  it("drops the dashboard and describes every remaining section", () => {
    const sections = memberSections("agent");

    expect(sections).toHaveLength(8);
    expect(sections.map((item) => item.href)).not.toContain("/member");
    expect(sections.every((item) => item.description)).toBe(true);
  });

  it("gives a leader an Add Member card too", () => {
    expect(memberSections("leader")).toHaveLength(9);
  });
});

describe("isActiveNavItem", () => {
  const dashboard = MEMBER_NAV[0];
  const sell = MEMBER_NAV.find((item) => item.href === "/member/sell")!;

  it("matches the dashboard only on an exact path", () => {
    expect(isActiveNavItem(dashboard, "/member")).toBe(true);
    expect(isActiveNavItem(dashboard, "/member/sell")).toBe(false);
  });

  it("matches a section on its own path and its sub-routes", () => {
    expect(isActiveNavItem(sell, "/member/sell")).toBe(true);
    expect(isActiveNavItem(sell, "/member/sell/products")).toBe(true);
  });

  it("does not match a different section with a shared prefix", () => {
    expect(isActiveNavItem(sell, "/member/selling")).toBe(false);
  });
});
