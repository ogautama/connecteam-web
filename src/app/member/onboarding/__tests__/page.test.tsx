import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { requireMember, getCompletedItemIds } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  getCompletedItemIds: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/onboardingProgress", () => ({ getCompletedItemIds }));

import OnboardingPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue({ id: "user_1", name: "Rani Putri", role: "agent" });
  getCompletedItemIds.mockResolvedValue([]);
});

describe("Onboarding page", () => {
  test("scopes progress lookup to the signed-in member", async () => {
    render(await OnboardingPage());

    expect(requireMember).toHaveBeenCalled();
    expect(getCompletedItemIds).toHaveBeenCalledWith("user_1");
  });

  test("never renders for a signed-out visitor — the guard redirects first", async () => {
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(getCompletedItemIds).not.toHaveBeenCalled();
  });

  test("renders all 5 tabs, Onboarding active by default", async () => {
    render(await OnboardingPage());

    const tabs = screen.getByRole("tablist", { name: "Quest Hub" });
    for (const label of ["Onboarding", "Recruiting", "Selling", "Referensi", "Kontak"]) {
      expect(within(tabs).getByRole("tab", { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getByRole("tab", { name: /Onboarding/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Level 1 — Onboarding" })).toBeInTheDocument();
  });

  test("Onboarding tab lists all 5 real checklist items as checkboxes", async () => {
    render(await OnboardingPage());

    for (const title of [
      "Kenali Dirimu",
      "Susun Targetmu",
      "Pelajari Sesuatu yang Baru",
      "Langsung Aksi",
      "Starter Kit",
    ]) {
      expect(screen.getByRole("checkbox", { name: title })).toBeInTheDocument();
    }
  });

  test("previously completed items render checked", async () => {
    getCompletedItemIds.mockResolvedValue(["know-yourself", "just-do-it"]);

    render(await OnboardingPage());

    expect(screen.getByRole("checkbox", { name: "Kenali Dirimu" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Susun Targetmu" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("other tabs render as placeholder shells, not fabricated content", async () => {
    render(await OnboardingPage());

    const recruitingPanel = document.getElementById(
      screen.getByRole("tab", { name: /Recruiting/ }).getAttribute("aria-controls")!,
    )!;
    expect(within(recruitingPanel).getByText("Level 2 — Recruiting")).toBeInTheDocument();
    expect(within(recruitingPanel).getAllByText("Segera hadir").length).toBeGreaterThan(0);
    expect(within(recruitingPanel).getByText("Di luar scope")).toBeInTheDocument();
  });
});
