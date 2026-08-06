import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireMember, getLeadForViewer, notFound } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  getLeadForViewer: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/leads", () => ({ getLeadForViewer }));
vi.mock("next/navigation", () => ({ notFound }));

import LeadDetailPage from "../page";
import { DISC_QUESTIONS } from "@/lib/disc/questions";

const agent = { id: "agent_1", name: "Budi Santoso", email: "budi@example.com", role: "agent" as const };

const answers = DISC_QUESTIONS.map((q) => q.statements[0].trait);
const lead = {
  id: "lead_1",
  source: "disc",
  name: "Sinta Rahayu",
  contact: "0812-3456-7890",
  inputs: { answers },
  result: {
    scores: { D: 24, I: 0, S: 0, C: 0 },
    percentages: { D: 100, I: 0, S: 0, C: 0 },
    dominant: ["D"],
    profileKey: "D",
  },
  createdAt: new Date("2026-08-06T00:00:00Z"),
  ownerId: "agent_1",
  owner: { id: "agent_1", name: "Budi Santoso" },
  takerUserId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue(agent);
  getLeadForViewer.mockResolvedValue(lead);
});

describe("/member/leads/[id]", () => {
  test("passes the viewer id and requested id to the scoped lookup", async () => {
    await LeadDetailPage({ params: Promise.resolve({ id: "lead_1" }) });
    expect(getLeadForViewer).toHaveBeenCalledWith("agent_1", "lead_1");
  });

  test("renders the trait breakdown, profile copy, and a WhatsApp button for a prospect", async () => {
    render(await LeadDetailPage({ params: Promise.resolve({ id: "lead_1" }) }));

    expect(screen.getByRole("heading", { name: /Sinta Rahayu/ })).toBeInTheDocument();
    expect(screen.getByText("D · Dominance")).toBeInTheDocument();
    expect(screen.getByText("Sang Penggerak")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chat di WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/6281234567890",
    );
    expect(screen.queryByText("Anggota")).not.toBeInTheDocument();
  });

  test("a member's own result shows the Anggota badge and no WhatsApp button", async () => {
    getLeadForViewer.mockResolvedValue({ ...lead, takerUserId: "agent_1" });
    render(await LeadDetailPage({ params: Promise.resolve({ id: "lead_1" }) }));

    expect(screen.getByText("Anggota")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Chat di WhatsApp" }),
    ).not.toBeInTheDocument();
  });

  test("404s (via notFound) when the lead doesn't exist or is outside the viewer's subtree", async () => {
    getLeadForViewer.mockResolvedValue(null);

    await expect(
      LeadDetailPage({ params: Promise.resolve({ id: "outside" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
