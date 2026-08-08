import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: userFindUnique } },
}));

import { getReferrerFirstName, getReferrerUnitName } from "@/lib/referrer";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getReferrerFirstName", () => {
  it("returns the first name for a known invite code", async () => {
    userFindUnique.mockResolvedValue({ name: "Olivia" });

    await expect(getReferrerFirstName("cku7abc")).resolves.toBe("Olivia");
  });

  it("truncates a multi-word name to its first token", async () => {
    userFindUnique.mockResolvedValue({ name: "Olivia Gautama Wijaya" });

    await expect(getReferrerFirstName("cku7abc")).resolves.toBe("Olivia");
  });

  it("selects the name and nothing else — no email, no id", async () => {
    userFindUnique.mockResolvedValue({ name: "Olivia" });

    await getReferrerFirstName("cku7abc");

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { inviteCode: "cku7abc" },
      select: { name: true },
    });
  });

  it("returns null for an unknown code, without erroring", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(getReferrerFirstName("nope")).resolves.toBeNull();
  });

  it("returns null when there is no code at all, without querying", async () => {
    await expect(getReferrerFirstName()).resolves.toBeNull();
    await expect(getReferrerFirstName("")).resolves.toBeNull();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("returns null rather than an empty string for a blank name", async () => {
    userFindUnique.mockResolvedValue({ name: "   " });

    await expect(getReferrerFirstName("cku7abc")).resolves.toBeNull();
  });
});

describe("getReferrerUnitName", () => {
  /** Wires `findUnique` to a small tree, keyed by inviteCode then by id. */
  function tree(rows: Record<string, unknown>) {
    userFindUnique.mockImplementation(
      async ({ where }: { where: { inviteCode?: string; id?: string } }) =>
        rows[where.inviteCode ?? where.id ?? ""] ?? null,
    );
  }

  it("walks up to the nearest leader above an agent", async () => {
    tree({
      cku7abc: {
        id: "agent_1",
        name: "Olivia Gautama",
        role: "agent",
        recruiterId: "agent_2",
      },
      agent_2: { name: "Dimas", role: "agent", recruiterId: "leader_1" },
      leader_1: { name: "Robert Hartono", role: "leader", recruiterId: "root" },
    });

    await expect(getReferrerUnitName("cku7abc")).resolves.toBe("Robert Hartono");
  });

  it("is its own unit when the referrer is the leader", async () => {
    // Where this differs from getPengundangUnitForMember, which starts at the
    // recruiter: a leader sharing their own link is the unit to name.
    tree({
      cku7abc: {
        id: "leader_1",
        name: "Robert Hartono",
        role: "leader",
        recruiterId: "root",
      },
    });

    await expect(getReferrerUnitName("cku7abc")).resolves.toBe("Robert Hartono");
  });

  it("returns the full name — it has to match the /join picklist", async () => {
    tree({
      cku7abc: {
        id: "leader_1",
        name: "Robert Hartono",
        role: "leader",
        recruiterId: null,
      },
    });

    await expect(getReferrerUnitName("cku7abc")).resolves.toBe("Robert Hartono");
  });

  it("returns null when the chain never reaches a leader", async () => {
    tree({
      cku7abc: {
        id: "root",
        name: "Root",
        role: "agent",
        recruiterId: null,
      },
    });

    await expect(getReferrerUnitName("cku7abc")).resolves.toBeNull();
  });

  it("returns null for an unknown code, and doesn't query without one", async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(getReferrerUnitName("nope")).resolves.toBeNull();

    userFindUnique.mockClear();
    await expect(getReferrerUnitName()).resolves.toBeNull();
    await expect(getReferrerUnitName("")).resolves.toBeNull();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("gives up on a cyclic chain instead of hanging", async () => {
    tree({
      cku7abc: { id: "a", name: "A", role: "agent", recruiterId: "b" },
      b: { name: "B", role: "agent", recruiterId: "a" },
      a: { name: "A", role: "agent", recruiterId: "b" },
    });

    await expect(getReferrerUnitName("cku7abc")).resolves.toBeNull();
  });
});
