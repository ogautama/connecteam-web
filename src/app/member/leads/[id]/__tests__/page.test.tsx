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

/**
 * A calculator lead's id has always been reachable here — `getLeadForViewer`
 * doesn't filter by source — and before Plan 05c this page cast every lead to
 * a DiscResult regardless. This fixture is the case that used to crash: no
 * `profileKey`, so the old `DISC_PROFILES[result.profileKey].title` threw on
 * undefined. Rendering it at all is the regression guard.
 */
const calculatorLead = {
  id: "lead_9",
  source: "calculator",
  name: "Dewi Anggraini",
  contact: "0812-3456-7890",
  inputs: {
    productType: "critical_PCA",
    planType: "Basic",
    dateOfBirth: "1998-08-09",
    gender: "Wanita",
    smokingStatus: "Non Smoker",
    sumAssured: 1_000_000_000,
    paymentTerm: 10,
  },
  result: {
    name: "Dewi Anggraini",
    gender: "Wanita",
    dateOfBirth: "1998-08-09",
    phone: "0812-3456-7890",
    smokingStatus: "Non Smoker",
    productType: "critical_PCA",
    productDisplayName: "Pru Critical Amanah",
    planType: "Basic",
    sumAssured: 1_000_000_000,
    premi: 14_190_000,
    monthlyPremium: 1_290_000,
    paymentTerm: 10,
    insuranceAge: 28,
    discount: 0,
    annualPremiumBeforeDiscount: 14_190_000,
    monthlyPremiumBeforeDiscount: 1_290_000,
    source: "member-calculator",
    quotedAt: "2026-08-08T03:00:00.000Z",
  },
  createdAt: new Date("2026-08-08T03:00:00Z"),
  ownerId: "agent_1",
  owner: { id: "agent_1", name: "Budi Santoso" },
  takerUserId: null,
};

describe("/member/leads/[id] — calculator lead (Plan 05c)", () => {
  beforeEach(() => {
    getLeadForViewer.mockResolvedValue(calculatorLead);
  });

  test("renders the quote instead of a DISC profile, without touching DISC_PROFILES", async () => {
    render(await LeadDetailPage({ params: Promise.resolve({ id: "lead_9" }) }));

    expect(
      screen.getByRole("heading", { name: /Dewi Anggraini/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pru Critical Amanah · Basic"),
    ).toBeInTheDocument();
    expect(screen.getByText("Rp 1.290.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 14.190.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 1.000.000.000")).toBeInTheDocument();
    expect(screen.getByText("10 tahun")).toBeInTheDocument();
    expect(screen.getByText("28 tahun")).toBeInTheDocument();
    expect(screen.getByText("Penawaran oleh Budi Santoso", { exact: false })).toBeInTheDocument();

    // Nothing DISC-shaped leaked through.
    expect(screen.queryByText("D · Dominance")).not.toBeInTheDocument();
    expect(screen.queryByText(/Lembar jawaban/)).not.toBeInTheDocument();
  });

  test("is display only — no PDF regeneration, just the recompute-in-the-calculator note", async () => {
    render(await LeadDetailPage({ params: Promise.resolve({ id: "lead_9" }) }));

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Butuh PDF-nya lagi/)).toHaveTextContent(
      /Hitung\s+ulang di kalkulator/,
    );
  });

  test("still offers WhatsApp for a non-member client", async () => {
    render(await LeadDetailPage({ params: Promise.resolve({ id: "lead_9" }) }));

    expect(
      screen.getByRole("link", { name: "Chat di WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/6281234567890");
  });
});
