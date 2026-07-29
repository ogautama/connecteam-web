import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECTION,
  MEMBER_NAV,
  filterForRole,
  isActiveNavItem,
  isValidSection,
  memberSections,
  navItemHref,
  sectionWithinItem,
  showsLeaderBadge,
  visibleNavItems,
} from "@/lib/member/nav";

const references = MEMBER_NAV.find((item) => item.label === "References")!;
const events = references.children!.find((item) => item.label === "Events")!;
const onboarding = MEMBER_NAV.find((item) => item.label === "Onboarding")!;
const recruiting = MEMBER_NAV.find((item) => item.label === "Recruiting")!;
const selling = MEMBER_NAV.find((item) => item.label === "Selling")!;
const calculator = MEMBER_NAV.find((item) => item.label === "Calculator")!;
const directory = MEMBER_NAV.find((item) => item.label === "Directory")!;
const dashboard = MEMBER_NAV[0];
const addMember = MEMBER_NAV.find((item) => item.label === "Add Member")!;

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

  it("keeps every top-level item's children nested rather than flattening them", () => {
    expect(onboarding.children!.map((child) => child.label)).toEqual([
      "Join & Isi Data",
      "Download PruForce",
      "Lisensi AAJI & AASI",
      "Kelas MFC & Sertifikasi Produk",
      "Kenali Dirimu",
      "Bikin Goals Pribadi / Susun Targetmu",
      "Setup WA, IG",
    ]);
    expect(recruiting.children!.map((child) => child.label)).toEqual([
      "Kenapa recruit dlu?",
      "Bank nama rekrut + FAST",
      "Presentasi bisnis ke calon rekrut",
      "Handling Obj calon rekrut",
    ]);
    expect(selling.children!.map((child) => child.label)).toEqual([
      "Learning Center",
      "Bank nama rekrut + FORM",
      "Sales Tools",
    ]);
    expect(calculator.children).toBeUndefined();
    expect(references.children!.map((child) => child.label)).toEqual([
      "Recording",
      "Commission",
      "Prestige",
      "Schedule Book (PDF Download)",
      "Prupay Link",
      "Claim",
      "Contests & Campaigns",
      "Events",
    ]);
    expect(directory.children!.map((child) => child.label)).toEqual([
      "Yellow Pages",
      "Who is Prudential",
      "Who is MRT Group",
      "Who is Connecteam",
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
          { label: "Open", section: "references-contests" as const },
          { label: "Secret", section: "references-events" as const, leaderOnly: true },
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
    const defaultItem = MEMBER_NAV.find((i) => i.section === DEFAULT_SECTION)!;
    expect(navItemHref(defaultItem)).toBe("/member/onboarding");
  });

  it("puts every other section behind ?section=", () => {
    expect(navItemHref(selling)).toBe("/member/onboarding?section=selling");
  });

  it("puts a nested child's own section behind ?section=", () => {
    expect(navItemHref(events)).toBe("/member/onboarding?section=references-events");
  });

  it("leaves real routes alone", () => {
    expect(navItemHref(dashboard)).toBe("/member");
  });
});

describe("isValidSection", () => {
  it("accepts a real section, including a nested one", () => {
    expect(isValidSection("selling")).toBe(true);
    expect(isValidSection("references-events")).toBe(true);
    expect(isValidSection("onboarding-kenali-dirimu")).toBe(true);
  });

  it("rejects junk, undefined, and the old pre-restructure ids", () => {
    expect(isValidSection("nope")).toBe(false);
    expect(isValidSection(undefined)).toBe(false);
    expect(isValidSection("events")).toBe(false);
    expect(isValidSection("directory")).toBe(true); // still a valid top-level id
  });
});

describe("showsLeaderBadge", () => {
  it("badges Add Member, the only role-gated item left, for leaders", () => {
    expect(showsLeaderBadge(addMember, "leader")).toBe(true);
  });

  it("does not advertise it to agents", () => {
    expect(showsLeaderBadge(addMember, "agent")).toBe(false);
  });

  it("leaves Events and Directory unbadged now that they've lost leader-only filtering", () => {
    expect(showsLeaderBadge(events, "leader")).toBe(false);
    expect(showsLeaderBadge(directory, "leader")).toBe(false);
  });
});

describe("sectionWithinItem", () => {
  it("matches a top-level item's own section", () => {
    expect(sectionWithinItem(selling, "selling")).toBe(true);
  });

  it("matches one of its children's sections", () => {
    expect(sectionWithinItem(references, "references-events")).toBe(true);
  });

  it("does not match an unrelated section", () => {
    expect(sectionWithinItem(references, "selling")).toBe(false);
  });
});

describe("memberSections", () => {
  it("drops the dashboard and flattens every child in, all described", () => {
    const sections = memberSections("agent");

    expect(sections.map((item) => item.label)).toEqual([
      "Onboarding",
      "Join & Isi Data",
      "Download PruForce",
      "Lisensi AAJI & AASI",
      "Kelas MFC & Sertifikasi Produk",
      "Kenali Dirimu",
      "Bikin Goals Pribadi / Susun Targetmu",
      "Setup WA, IG",
      "Recruiting",
      "Kenapa recruit dlu?",
      "Bank nama rekrut + FAST",
      "Presentasi bisnis ke calon rekrut",
      "Handling Obj calon rekrut",
      "Selling",
      "Learning Center",
      "Bank nama rekrut + FORM",
      "Sales Tools",
      "Calculator",
      "References",
      "Recording",
      "Commission",
      "Prestige",
      "Schedule Book (PDF Download)",
      "Prupay Link",
      "Claim",
      "Contests & Campaigns",
      "Events",
      "Directory",
      "Yellow Pages",
      "Who is Prudential",
      "Who is MRT Group",
      "Who is Connecteam",
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
    expect(
      isActiveNavItem(references, "/member/onboarding", "references-events"),
    ).toBe(false);
    expect(isActiveNavItem(events, "/member/onboarding", "references-events")).toBe(
      true,
    );
  });

  it("matches a real route on its own path and sub-routes", () => {
    expect(
      isActiveNavItem(addMember, "/member/admin/add-member", "onboarding"),
    ).toBe(true);
    expect(
      isActiveNavItem(addMember, "/member/admin/add-member/new", "onboarding"),
    ).toBe(true);
  });
});
