import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import MemberNav from "../MemberNav";

const { usePathname, useSearchParams } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/member"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({ usePathname, useSearchParams }));

beforeEach(() => {
  usePathname.mockReturnValue("/member");
  useSearchParams.mockReturnValue(new URLSearchParams());
});

describe("MemberNav", () => {
  test("renders the dashboard plus every top-level section, collapsed by default (Onboarding has no children to expand)", () => {
    usePathname.mockReturnValue("/member/onboarding");
    render(<MemberNav role="agent" />);

    const nav = screen.getByRole("navigation", { name: "Member" });
    // Dashboard, Onboarding, Recruiting, Selling, Calculator, References,
    // Directory — nothing expands since Onboarding (the default/active
    // section) has no sidebar children of its own.
    expect(within(nav).getAllByRole("link")).toHaveLength(7);
    expect(within(nav).getByRole("link", { name: "Onboarding" })).toHaveAttribute(
      "href",
      "/member/onboarding",
    );
    expect(within(nav).getByRole("link", { name: "Recruiting" })).toHaveAttribute(
      "href",
      "/member/onboarding?section=recruiting",
    );
    expect(within(nav).getByRole("link", { name: "Directory" })).toHaveAttribute(
      "href",
      "/member/onboarding?section=directory",
    );
    // Onboarding has no children at all, so no chevron renders for it.
    expect(
      within(nav).queryByRole("button", { name: /Onboarding/ }),
    ).not.toBeInTheDocument();
    // Recruiting has children but isn't the active section, so they're hidden.
    expect(
      within(nav).queryByRole("link", { name: "Kenapa recruit dlu?" }),
    ).not.toBeInTheDocument();
  });

  test("expands whichever top-level item's subtree matches the active section", () => {
    usePathname.mockReturnValue("/member/onboarding");
    useSearchParams.mockReturnValue(new URLSearchParams("section=references-events"));

    render(<MemberNav role="agent" />);

    const references = screen.getByRole("link", { name: "References" });
    const group = references.closest("li")!;

    expect(
      within(group).getByRole("link", { name: "Contests & Campaigns" }),
    ).toHaveAttribute("href", "/member/onboarding?section=references-contests");
    expect(within(group).getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/member/onboarding?section=references-events",
    );
    // A different top-level item's children stay collapsed.
    expect(
      screen.queryByRole("link", { name: "Learning Center" }),
    ).not.toBeInTheDocument();
  });

  test("the chevron toggles children independently of the label link", () => {
    usePathname.mockReturnValue("/member/onboarding");
    useSearchParams.mockReturnValue(new URLSearchParams("section=selling"));

    render(<MemberNav role="agent" />);

    expect(screen.getByRole("link", { name: "Recruiting" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Kenapa recruit dlu?" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Expand Recruiting/ }));

    expect(
      screen.getByRole("link", { name: "Kenapa recruit dlu?" }),
    ).toBeInTheDocument();
    // Selling (the active section) is unaffected by toggling Recruiting.
    expect(screen.getByRole("link", { name: "Learning Center" })).toBeInTheDocument();
  });

  test("marks the section from the query string as the active page", () => {
    usePathname.mockReturnValue("/member/onboarding");
    useSearchParams.mockReturnValue(new URLSearchParams("section=selling"));

    render(<MemberNav role="agent" />);

    expect(screen.getByRole("link", { name: "Selling" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Onboarding" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("defaults to Onboarding active when no section is set", () => {
    usePathname.mockReturnValue("/member/onboarding");

    render(<MemberNav role="agent" />);

    expect(screen.getByRole("link", { name: "Onboarding" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("a parent does not light up for its child's section", () => {
    usePathname.mockReturnValue("/member/onboarding");
    useSearchParams.mockReturnValue(new URLSearchParams("section=references-events"));

    render(<MemberNav role="agent" />);

    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "References" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("shows an agent no Add Member link", () => {
    render(<MemberNav role="agent" />);

    expect(
      screen.queryByRole("link", { name: /Add Member/ }),
    ).not.toBeInTheDocument();
  });

  test("badges Add Member for a leader", () => {
    render(<MemberNav role="leader" />);

    expect(
      screen.getByRole("link", { name: /Add Member Leaders/ }),
    ).toBeInTheDocument();
  });
});
