import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { requireMember, getLeadsForViewer } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  getLeadsForViewer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/leads", () => ({ getLeadsForViewer }));

import LeadsPage from "../page";

const leader = { id: "leader_1", name: "Citra Lestari", email: "citra@example.com", role: "leader" as const };

function prospectLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "lead_1",
    source: "disc",
    name: "Sinta Rahayu",
    contact: "0812-3456-7890",
    inputs: { answers: [] },
    result: { scores: { D: 5, I: 3, S: 2, C: 2 }, percentages: { D: 42, I: 25, S: 17, C: 17 }, dominant: ["D"], profileKey: "D" },
    createdAt: new Date("2026-08-06T00:00:00Z"),
    ownerId: "agent_1",
    owner: { id: "agent_1", name: "Budi Santoso" },
    takerUserId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue(leader);
  getLeadsForViewer.mockResolvedValue([]);
});

describe("/member/leads", () => {
  test("scopes the query to the signed-in viewer, not any request param", async () => {
    await LeadsPage();
    expect(getLeadsForViewer).toHaveBeenCalledWith("leader_1", "disc");
  });

  test("shows an empty state pointing at the referral link when there are none yet", async () => {
    render(await LeadsPage());
    expect(screen.getByText("Belum ada leads")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ke link tes kamu" }),
    ).toHaveAttribute("href", "/member");
  });

  test("renders a prospect row with a wa.me link and no Anggota badge", async () => {
    getLeadsForViewer.mockResolvedValue([prospectLead()]);
    render(await LeadsPage());

    const row = screen.getByText("Sinta Rahayu").closest("tr")!;
    expect(within(row).queryByText("Anggota")).not.toBeInTheDocument();
    expect(within(row).getByText("0812-3456-7890").closest("a")).toHaveAttribute(
      "href",
      "https://wa.me/6281234567890",
    );
    expect(within(row).getByText("D")).toBeInTheDocument();
    expect(within(row).getByText("Budi Santoso")).toBeInTheDocument();
  });

  test("renders a member's own result with the Anggota badge and a plain email, no wa.me", async () => {
    getLeadsForViewer.mockResolvedValue([
      prospectLead({
        id: "lead_2",
        name: "Budi Santoso",
        contact: "budi.s@gmail.com",
        takerUserId: "agent_1",
      }),
    ]);
    render(await LeadsPage());

    const row = screen.getByText("Budi Santoso", { selector: "a" }).closest("tr")!;
    expect(within(row).getByText("Anggota")).toBeInTheDocument();
    expect(within(row).getByText("budi.s@gmail.com").closest("a")).toBeNull();
  });

  test("links each row to its detail page", async () => {
    getLeadsForViewer.mockResolvedValue([prospectLead()]);
    render(await LeadsPage());

    expect(screen.getByRole("link", { name: "Sinta Rahayu" })).toHaveAttribute(
      "href",
      "/member/leads/lead_1",
    );
  });
});
