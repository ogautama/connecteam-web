import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketingLayout from "../MarketingLayout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("MarketingLayout", () => {
  test("renders children", () => {
    render(
      <MarketingLayout>
        <p>Page content</p>
      </MarketingLayout>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  test("renders header, primary nav, and footer landmarks", () => {
    render(
      <MarketingLayout>
        <p>Page content</p>
      </MarketingLayout>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  test("shows the signed-in member instead of a Login button when a user is passed", () => {
    render(
      <MarketingLayout
        user={{ id: "user_1", name: "Rani Putri", email: "rani@example.com", role: "agent" }}
      >
        <p>Page content</p>
      </MarketingLayout>,
    );

    expect(screen.getByRole("button", { name: /Rani Putri/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
  });
});
