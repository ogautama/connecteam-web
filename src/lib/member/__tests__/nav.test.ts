import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECTION,
  MEMBER_NAV,
  filterForRole,
  isActiveNavItem,
  isValidSection,
  memberSections,
  navItemHref,
  showsLeaderBadge,
  visibleNavItems,
} from "@/lib/member/nav";

const references = MEMBER_NAV.find((item) => item.label === "References")!;
const events = references.children!.find((item) => item.label === "Events")!;
const selling = MEMBER_NAV.find((item) => item.label === "Selling")!;
const dashboard = MEMBER_NAV[0];

describe("visibleNavItems", () => {
  it("shows an agent the dashboard plus every top-level section", () => {
    const labels = visibleNavItems("agent").map((item) => item.label);

    expect(labels).toEqual([
      "Dashboard",
      "Onboarding",
      "Recruiting",
      "Selling",
      "Calculator",
      "References",
      "Directory",
    ]);
  });

  it("adds Add Member for a leader, and only for a leader", () => {
    expect(visibleNavItems("leader").map((item) => item.label)).toContain(
      "Add Member",
    );
    expect(visibleNavItems("agent").map((item) => item.label)).not.toContain(
      "Add Member",
    );
  });

  it("keeps References' children nested rather than flattening them", () => {
    const refs = visibleNavItems("agent").find((i) => i.label === "References")!;

    expect(refs.children!.map((child) => child.label)).toEqual([
      "Contests & Campaigns",
      "Events",
    ]);
  });
});

describe("filterForRole", () => {
  it("hides a leader-only child from an agent but keeps its parent", () => {
    const items = [
      {
        label: "Parent",
        section: "references" as const,
        children: [
          { label: "Open", section: "contests" as const },
          { label: "Secret", section: "events" as const, leaderOnly: true },
        ],
      },
    ];

    const forAgent = filterForRole(items, "agent");
    expect(forAgent).toHaveLength(1);
    expect(forAgent[0].children!.map((c) => c.label)).toEqual(["Open"]);
    expect(filterForRole(items, "leader")[0].children).toHaveLength(2);
  });
});

describe("navItemHref", () => {
  it("gives the default section a bare path, not a redundant query", () => {
    const onboarding = MEMBER_NAV.find((i) => i.section === DEFAULT_SECTION)!;
    expect(navItemHref(onboarding)).toBe("/member/onboarding");
  });

  it("puts every other section behind ?section=", () => {
    expect(navItemHref(selling)).toBe("/member/onboarding?section=selling");
  });

  it("leaves real routes alone", () => {
    expect(navItemHref(dashboard)).toBe("/member");
  });
});

describe("isValidSection", () => {
  it("accepts a real section, including a nested one", () => {
    expect(isValidSection("selling")).toBe(true);
    expect(isValidSection("events")).toBe(true);
  });

  it("rejects junk and undefined, so a hand-edited URL can fall back", () => {
    expect(isValidSection("nope")).toBe(false);
    expect(isValidSection(undefined)).toBe(false);
  });
});

describe("showsLeaderBadge", () => {
  it("badges a section holding leader-only items, for leaders", () => {
    expect(showsLeaderBadge(events, "leader")).toBe(true);
  });

  it("does not advertise it to agents", () => {
    expect(showsLeaderBadge(events, "agent")).toBe(false);
  });

  it("leaves sections with no leader-only content unbadged", () => {
    expect(showsLeaderBadge(selling, "leader")).toBe(false);
  });
});

describe("memberSections", () => {
  it("drops the dashboard and flattens children in, all described", () => {
    const sections = memberSections("agent");

    expect(sections.map((item) => item.label)).toEqual([
      "Onboarding",
      "Recruiting",
      "Selling",
      "Calculator",
      "References",
      "Contests & Campaigns",
      "Events",
      "Directory",
    ]);
    expect(sections.every((item) => item.description)).toBe(true);
  });

  it("gives a leader an Add Member card too", () => {
    expect(memberSections("leader").map((i) => i.label)).toContain("Add Member");
  });
});

describe("isActiveNavItem", () => {
  it("matches the dashboard only on an exact path", () => {
    expect(isActiveNavItem(dashboard, "/member", "onboarding")).toBe(true);
    expect(isActiveNavItem(dashboard, "/member/onboarding", "onboarding")).toBe(
      false,
    );
  });

  it("matches a hub section on the section, not the path", () => {
    expect(isActiveNavItem(selling, "/member/onboarding", "selling")).toBe(true);
    expect(isActiveNavItem(selling, "/member/onboarding", "recruiting")).toBe(
      false,
    );
  });

  it("does not light a hub section up from another route", () => {
    expect(isActiveNavItem(selling, "/member", "selling")).toBe(false);
  });

  it("does not light a parent up for its child's section", () => {
    expect(isActiveNavItem(references, "/member/onboarding", "events")).toBe(
      false,
    );
    expect(isActiveNavItem(events, "/member/onboarding", "events")).toBe(true);
  });

  it("matches a real route on its own path and sub-routes", () => {
    const addMember = MEMBER_NAV.find((i) => i.label === "Add Member")!;
    expect(
      isActiveNavItem(addMember, "/member/admin/add-member", "onboarding"),
    ).toBe(true);
    expect(
      isActiveNavItem(addMember, "/member/admin/add-member/new", "onboarding"),
    ).toBe(true);
  });
});
