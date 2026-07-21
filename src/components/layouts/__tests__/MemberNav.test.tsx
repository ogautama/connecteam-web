import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MemberNav from "../MemberNav";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/member"),
}));

vi.mock("next/navigation", () => ({ usePathname }));

describe("MemberNav", () => {
  test("renders the dashboard plus all 8 section links for an agent", () => {
    render(<MemberNav role="agent" />);

    const nav = screen.getByRole("navigation", { name: "Member" });
    expect(within(nav).getAllByRole("link")).toHaveLength(9);
    expect(
      within(nav).getByRole("link", { name: "Get Started" }),
    ).toHaveAttribute("href", "/member/onboarding");
    expect(within(nav).getByRole("link", { name: "Directory" })).toHaveAttribute(
      "href",
      "/member/directory",
    );
  });

  test("marks the current section as the active page", () => {
    usePathname.mockReturnValue("/member/sell");
    render(<MemberNav role="agent" />);

    expect(screen.getByRole("link", { name: "Sell" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("badges leader-content sections for leaders only", () => {
    usePathname.mockReturnValue("/member");
    render(<MemberNav role="leader" />);
    expect(
      screen.getByRole("link", { name: /Events Leaders/ }),
    ).toBeInTheDocument();
  });

  test("shows an agent no Leaders badge", () => {
    usePathname.mockReturnValue("/member");
    render(<MemberNav role="agent" />);

    expect(screen.queryByText("Leaders")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Events" })).toBeInTheDocument();
  });
});
