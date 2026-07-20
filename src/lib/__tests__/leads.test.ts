import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      create: vi.fn().mockResolvedValue({ id: "lead_1" }),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { createLead } from "@/lib/leads";

describe("createLead", () => {
  it("calls prisma.lead.create with the expected shape", async () => {
    await createLead({
      source: "calculator",
      name: "Jane Doe",
      contact: "jane@example.com",
      inputs: { age: 30 },
      result: { score: 42 },
    });

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: {
        source: "calculator",
        name: "Jane Doe",
        contact: "jane@example.com",
        inputs: { age: 30 },
        result: { score: 42 },
      },
    });
  });
});
