import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { requireMember, getCompletedItemIds, getTestResultState } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  getCompletedItemIds: vi.fn(),
  getTestResultState: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/onboardingProgress", () => ({ getCompletedItemIds }));
vi.mock("../testResultState", () => ({ getTestResultState }));

import MemberHubPage from "../page";

function renderAt(section?: string, completed: string[] = []) {
  getCompletedItemIds.mockResolvedValue(completed);
  return MemberHubPage({ searchParams: Promise.resolve({ section }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue({
    id: "user_1",
    name: "Rani Putri",
    email: "rani@example.com",
    role: "agent",
  });
  getCompletedItemIds.mockResolvedValue([]);
  getTestResultState.mockResolvedValue(null);
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

  test("defaults to Onboarding, listing its 4 items as checkboxes", async () => {
    render(await renderAt());

    expect(screen.getByRole("heading", { level: 1, name: "Onboarding" })).toBeInTheDocument();
    for (const title of [
      "Download PruForce",
      "Kenali Dirimu",
      "Bikin Goals Pribadi / Susun Targetmu",
      "Setup WA, IG",
    ]) {
      expect(screen.getByRole("checkbox", { name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  });

  test("the three items dropped on 2026-08-05 are gone from the checklist", async () => {
    render(await renderAt());

    // Isi Data moved to AccountMenu's "Profile"; the two license/class steps
    // were hidden as empty placeholders.
    for (const title of [
      "Isi Data",
      "Lisensi AAJI & AASI",
      "Kelas MFC & Sertifikasi Produk",
    ]) {
      expect(screen.queryByRole("checkbox", { name: title })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: title })).not.toBeInTheDocument();
    }
  });

  test("previously completed items render checked", async () => {
    render(await renderAt(undefined, ["know-yourself", "setup-wa-ig"]));

    expect(screen.getByRole("checkbox", { name: "Kenali Dirimu" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("checkbox", { name: "Download PruForce" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("a leftover join-isi-data progress row can't resurrect the removed item", async () => {
    // The accompanying migration deletes these rows, but the page must not
    // depend on that having run — an unknown itemId is simply not rendered.
    render(await renderAt(undefined, ["join-isi-data", "know-yourself"]));

    expect(screen.queryByRole("checkbox", { name: "Isi Data" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    // ...and it doesn't inflate the count either: 1 of 4, not 2 of 4.
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  test("expanding Kenali Dirimu shows its real DISC/MBTI content, not a placeholder", async () => {
    render(await renderAt());

    fireEvent.click(screen.getByRole("button", { name: /Kenali Dirimu/ }));

    expect(screen.getByRole("link", { name: "Tes DISC" })).toHaveAttribute(
      "href",
      "/tools/disc",
    );
  });

  test("expanding a placeholder onboarding item shows its Segera hadir / Di luar scope tag", async () => {
    render(await renderAt());

    fireEvent.click(screen.getByRole("button", { name: /Download PruForce/ }));

    expect(screen.getByText("Segera hadir")).toBeInTheDocument();
  });

  test("renders a top-level parent as a landing page linking to its children", async () => {
    render(await renderAt("recruiting"));

    expect(screen.getByRole("heading", { level: 1, name: "Recruiting" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Kenapa recruit dlu\?/ }),
    ).toHaveAttribute("href", "/member/onboarding?section=recruiting-why");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  test("renders a nested leaf section with its placeholder content", async () => {
    render(await renderAt("recruiting-bank-fast"));

    expect(
      screen.getByRole("heading", { level: 1, name: "Bank nama rekrut + FAST" }),
    ).toBeInTheDocument();
    // The deferred CRM feature is tagged apart from merely-unsourced content.
    expect(screen.getByText("Di luar scope")).toBeInTheDocument();
  });

  test("renders a deeply-nested section the same way as any other leaf", async () => {
    render(await renderAt("references-events"));

    expect(screen.getByRole("heading", { level: 1, name: "Events" })).toBeInTheDocument();
    expect(screen.getAllByText("Segera hadir").length).toBeGreaterThan(0);
  });

  test("falls back to Onboarding on a junk section rather than crashing", async () => {
    render(await renderAt("not-a-section"));

    expect(screen.getByRole("heading", { level: 1, name: "Onboarding" })).toBeInTheDocument();
  });

  test("shows overall onboarding progress regardless of active section", async () => {
    render(await renderAt("selling", ["know-yourself"]));

    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});
