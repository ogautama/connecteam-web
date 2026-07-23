import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { STARTER_KIT } from "@/content/onboarding";
import OnboardingPage from "../page";

describe("Onboarding page", () => {
  test("renders all four onboarding sub-sections", () => {
    render(<OnboardingPage />);

    expect(
      screen.getByRole("heading", { name: "Kenali Dirimu" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Susun Targetmu")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pelajari Sesuatu yang Baru" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Langsung Aksi")).toBeInTheDocument();
  });

  test("renders all 4 starter-kit downloads", () => {
    render(<OnboardingPage />);

    const section = screen
      .getByRole("heading", { name: "Starter Kit" })
      .closest("section")!;

    for (const item of STARTER_KIT) {
      expect(within(section).getByText(item.label)).toBeInTheDocument();
    }
  });

  test("DISC link points at our own tool, not the old external URL", () => {
    render(<OnboardingPage />);

    expect(screen.getByRole("link", { name: /Tes DISC/ })).toHaveAttribute(
      "href",
      "/tools/disc",
    );
  });
});
