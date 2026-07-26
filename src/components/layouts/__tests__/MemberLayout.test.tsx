import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MemberLayout from "../MemberLayout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/member",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const user = { id: "user_1", name: "Rani Putri", role: "agent" as const };

describe("MemberLayout", () => {
  test("renders children", () => {
    render(
      <MemberLayout user={user}>
        <p>Dashboard content</p>
      </MemberLayout>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  test("renders the header and member nav around them", () => {
    render(
      <MemberLayout user={user}>
        <p>Dashboard content</p>
      </MemberLayout>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Member" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Onboarding" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directory" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Rani Putri/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });
});
