import { beforeEach, describe, expect, it, vi } from "vitest";

const { leadCreate, leadFindMany, leadFindUnique, getDescendantUserIds } = vi.hoisted(() => ({
  leadCreate: vi.fn().mockResolvedValue({ id: "lead_1" }),
  leadFindMany: vi.fn(),
  leadFindUnique: vi.fn(),
  getDescendantUserIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      create: leadCreate,
      findMany: leadFindMany,
      findUnique: leadFindUnique,
    },
  },
}));

vi.mock("@/lib/recruitTree", () => ({ getDescendantUserIds }));

import { createLead, getLeadForViewer, getLeadsForViewer } from "@/lib/leads";

beforeEach(() => {
  vi.clearAllMocks();
  leadCreate.mockResolvedValue({ id: "lead_1" });
});

describe("createLead", () => {
  it("calls prisma.lead.create with the expected shape, ownerId included", async () => {
    await createLead({
      source: "calculator",
      name: "Jane Doe",
      contact: "jane@example.com",
      inputs: { age: 30 },
      result: { score: 42 },
      ownerId: "user_root",
    });

    expect(leadCreate).toHaveBeenCalledWith({
      data: {
        source: "calculator",
        name: "Jane Doe",
        contact: "jane@example.com",
        inputs: { age: 30 },
        result: { score: 42 },
        ownerId: "user_root",
        takerUserId: undefined,
      },
    });
  });

  it("passes takerUserId through when the taker is a signed-in member", async () => {
    await createLead({
      source: "disc",
      name: "Rani",
      contact: "rani@example.com",
      inputs: {},
      result: {},
      ownerId: "user_rani",
      takerUserId: "user_rani",
    });

    expect(leadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: "user_rani", takerUserId: "user_rani" }),
      }),
    );
  });
});

describe("getLeadsForViewer", () => {
  it("scopes the query to the viewer's own subtree, not by filtering after", async () => {
    getDescendantUserIds.mockResolvedValue(["leader", "agentA"]);
    leadFindMany.mockResolvedValue([]);

    await getLeadsForViewer("leader", "disc");

    expect(getDescendantUserIds).toHaveBeenCalledWith("leader");
    expect(leadFindMany).toHaveBeenCalledWith({
      where: { source: "disc", ownerId: { in: ["leader", "agentA"] } },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true } } },
    });
  });
});

describe("getLeadForViewer", () => {
  it("returns null when the id doesn't exist", async () => {
    leadFindUnique.mockResolvedValue(null);

    const result = await getLeadForViewer("leader", "missing");

    expect(result).toBeNull();
    expect(getDescendantUserIds).not.toHaveBeenCalled();
  });

  it("returns null when the lead exists but is outside the viewer's subtree", async () => {
    leadFindUnique.mockResolvedValue({ id: "lead_1", ownerId: "outsider" });
    getDescendantUserIds.mockResolvedValue(["leader", "agentA"]);

    const result = await getLeadForViewer("leader", "lead_1");

    expect(result).toBeNull();
  });

  it("returns the lead when it's inside the viewer's subtree", async () => {
    const lead = { id: "lead_1", ownerId: "agentA" };
    leadFindUnique.mockResolvedValue(lead);
    getDescendantUserIds.mockResolvedValue(["leader", "agentA"]);

    const result = await getLeadForViewer("leader", "lead_1");

    expect(result).toBe(lead);
  });
});
