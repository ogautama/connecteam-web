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

/** The page's props, with no `?source=` unless a test asks for one. */
function props(source?: string) {
  return { searchParams: Promise.resolve(source ? { source } : {}) };
}

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

function calculatorLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue(leader);
  getLeadsForViewer.mockResolvedValue([]);
});

describe("/member/leads — DISC (the default tab)", () => {
  test("scopes the query to the signed-in viewer, not any request param", async () => {
    await LeadsPage(props());
    expect(getLeadsForViewer).toHaveBeenCalledWith("leader_1", "disc");
  });

  test("shows an empty state pointing at the referral link when there are none yet", async () => {
    render(await LeadsPage(props()));
    expect(screen.getByText("Belum ada leads")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ke link tes kamu" }),
    ).toHaveAttribute("href", "/member");
  });

  test("renders a prospect row with a wa.me link and no Anggota badge", async () => {
    getLeadsForViewer.mockResolvedValue([prospectLead()]);
    render(await LeadsPage(props()));

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
    render(await LeadsPage(props()));

    const row = screen.getByText("Budi Santoso", { selector: "a" }).closest("tr")!;
    expect(within(row).getByText("Anggota")).toBeInTheDocument();
    expect(within(row).getByText("budi.s@gmail.com").closest("a")).toBeNull();
  });

  test("links each row to its detail page", async () => {
    getLeadsForViewer.mockResolvedValue([prospectLead()]);
    render(await LeadsPage(props()));

    expect(screen.getByRole("link", { name: "Sinta Rahayu" })).toHaveAttribute(
      "href",
      "/member/leads/lead_1",
    );
  });

  test("an unrecognised ?source= falls back to DISC rather than querying for it", async () => {
    await LeadsPage(props("mbti"));
    expect(getLeadsForViewer).toHaveBeenCalledWith("leader_1", "disc");
  });
});

describe("/member/leads — Calculator tab (Plan 05c)", () => {
  test("?source=calculator queries the calculator source, still scoped to the viewer", async () => {
    await LeadsPage(props("calculator"));
    expect(getLeadsForViewer).toHaveBeenCalledWith("leader_1", "calculator");
  });

  test("offers both tabs and marks the current one selected", async () => {
    render(await LeadsPage(props("calculator")));

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["DISC", "Kalkulator"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("href", "/member/leads?source=disc");
  });

  test("its empty state points at the calculator, not the DISC link", async () => {
    render(await LeadsPage(props("calculator")));
    expect(screen.getByRole("link", { name: "Ke kalkulator" })).toHaveAttribute(
      "href",
      "/member/calculator",
    );
    expect(
      screen.queryByRole("link", { name: "Ke link tes kamu" }),
    ).not.toBeInTheDocument();
  });

  test("shows product, plan, sum assured and premium — and no DISC Profil column", async () => {
    getLeadsForViewer.mockResolvedValue([calculatorLead()]);
    render(await LeadsPage(props("calculator")));

    expect(screen.queryByText("Profil")).not.toBeInTheDocument();

    const row = screen.getByText("Dewi Anggraini").closest("tr")!;
    expect(within(row).getByText("Pru Critical Amanah")).toBeInTheDocument();
    expect(within(row).getByText("· Basic")).toBeInTheDocument();
    expect(within(row).getByText("Rp 1.000.000.000")).toBeInTheDocument();
    expect(within(row).getByText("Rp 1.290.000")).toBeInTheDocument();
    expect(within(row).getByText("Budi Santoso")).toBeInTheDocument();
  });

  test("links a calculator row to its detail page", async () => {
    getLeadsForViewer.mockResolvedValue([calculatorLead()]);
    render(await LeadsPage(props("calculator")));

    expect(
      screen.getByRole("link", { name: "Dewi Anggraini" }),
    ).toHaveAttribute("href", "/member/leads/lead_9");
  });
});
