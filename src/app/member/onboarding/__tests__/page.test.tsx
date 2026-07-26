import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireMember, getCompletedItemIds } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  getCompletedItemIds: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/onboardingProgress", () => ({ getCompletedItemIds }));

import MemberHubPage from "../page";

function renderAt(section?: string, completed: string[] = []) {
  getCompletedItemIds.mockResolvedValue(completed);
  return MemberHubPage({ searchParams: Promise.resolve({ section }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue({ id: "user_1", name: "Rani Putri", role: "agent" });
  getCompletedItemIds.mockResolvedValue([]);
});

describe("member hub page", () => {
  test("scopes progress lookup to the signed-in member", async () => {
    render(await renderAt());

    expect(requireMember).toHaveBeenCalled();
    expect(getCompletedItemIds).toHaveBeenCalledWith("user_1");
  });

  test("never renders for a signed-out visitor — the guard redirects first", async () => {
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(renderAt()).rejects.toThrow("NEXT_REDIRECT");
    expect(getCompletedItemIds).not.toHaveBeenCalled();
  });

  test("defaults to Onboarding, listing its 5 items as checkboxes", async () => {
    render(await renderAt());

    expect(screen.getByRole("heading", { level: 1, name: "Onboarding" })).toBeInTheDocument();
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
    render(await renderAt(undefined, ["know-yourself", "just-do-it"]));

    expect(screen.getByRole("checkbox", { name: "Kenali Dirimu" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Susun Targetmu" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("renders the section named in the query string", async () => {
    render(await renderAt("recruiting"));

    expect(screen.getByRole("heading", { level: 1, name: "Recruiting" })).toBeInTheDocument();
    expect(screen.getAllByText("Segera hadir").length).toBeGreaterThan(0);
    // The deferred CRM feature is tagged apart from merely-unsourced content.
    expect(screen.getByText("Di luar scope")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  test("renders a nested section the same way as a top-level one", async () => {
    render(await renderAt("events"));

    expect(screen.getByRole("heading", { level: 1, name: "Events" })).toBeInTheDocument();
  });

  test("falls back to Onboarding on a junk section rather than crashing", async () => {
    render(await renderAt("not-a-section"));

    expect(screen.getByRole("heading", { level: 1, name: "Onboarding" })).toBeInTheDocument();
  });

  test("shows overall onboarding progress regardless of active section", async () => {
    render(await renderAt("selling", ["know-yourself"]));

    expect(screen.getByText("20%")).toBeInTheDocument();
  });
});
