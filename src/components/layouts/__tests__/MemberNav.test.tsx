import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  test("renders the dashboard plus every section, nested ones included", () => {
    render(<MemberNav role="agent" />);

    const nav = screen.getByRole("navigation", { name: "Member" });
    // Dashboard + Onboarding/Recruiting/Selling/Calculator/References
    // (+ Contests, Events) + Directory
    expect(within(nav).getAllByRole("link")).toHaveLength(9);
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
  });

  test("nests Contests and Events beneath References", () => {
    render(<MemberNav role="agent" />);

    const references = screen.getByRole("link", { name: "References" });
    const group = references.closest("li")!;

    expect(
      within(group).getByRole("link", { name: "Contests & Campaigns" }),
    ).toHaveAttribute("href", "/member/onboarding?section=contests");
    expect(within(group).getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/member/onboarding?section=events",
    );
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
    useSearchParams.mockReturnValue(new URLSearchParams("section=events"));

    render(<MemberNav role="agent" />);

    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "References" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("badges leader-content sections for leaders only", () => {
    render(<MemberNav role="leader" />);

    expect(
      screen.getByRole("link", { name: /Events Leaders/ }),
    ).toBeInTheDocument();
    // Add Member is leader-only, so it carries the badge in its name too.
    expect(
      screen.getByRole("link", { name: /Add Member/ }),
    ).toBeInTheDocument();
  });

  test("shows an agent no Leaders badge and no Add Member", () => {
    render(<MemberNav role="agent" />);

    expect(screen.queryByText("Leaders")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Add Member/ }),
    ).not.toBeInTheDocument();
  });
});
