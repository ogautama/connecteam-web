import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const {
  userFindUnique,
  userFindMany,
  inviteFindUnique,
  inviteFindMany,
  inviteCreate,
  getDescendantUserIds,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  inviteFindUnique: vi.fn(),
  inviteFindMany: vi.fn(),
  inviteCreate: vi.fn(),
  getDescendantUserIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, findMany: userFindMany },
    pendingInvite: {
      findUnique: inviteFindUnique,
      findMany: inviteFindMany,
      create: inviteCreate,
    },
  },
}));

vi.mock("@/lib/recruitTree", () => ({ getDescendantUserIds }));

import {
  createPendingInvite,
  daysWaiting,
  isValidEmail,
  listPendingInvitesFor,
  listRecruiterOptionsFor,
  normalizeEmail,
  resolveInviteRecruiter,
} from "@/lib/invites";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isValidEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isValidEmail(" Rani@Gmail.com ")).toBe(true);
  });

  it("rejects blanks and obvious typos", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("rani")).toBe(false);
    expect(isValidEmail("rani@gmail")).toBe(false);
    expect(isValidEmail("rani gmail.com")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases so duplicates actually collide", () => {
    expect(normalizeEmail("  Rani@Gmail.COM ")).toBe("rani@gmail.com");
  });
});

describe("listRecruiterOptionsFor", () => {
  it("offers the leader their own branch and nobody else", async () => {
    // A recruited B and S; B recruited C. B is the one adding a member.
    getDescendantUserIds.mockResolvedValue(["B", "C"]);
    userFindMany.mockResolvedValue([]);

    await listRecruiterOptionsFor("B");

    expect(getDescendantUserIds).toHaveBeenCalledWith("B");
    expect(userFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["B", "C"] }, status: "active" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  });
});

describe("resolveInviteRecruiter", () => {
  beforeEach(() => {
    // B's branch: B (self-inclusive) and their recruit C.
    getDescendantUserIds.mockResolvedValue(["B", "C"]);
  });

  it("uses the picked recruiter when they're in the branch", async () => {
    expect(await resolveInviteRecruiter({ leaderId: "B", recruiterId: "C" })).toBe(
      "C",
    );
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("refuses a recruiter outside the branch, even by direct POST", async () => {
    // "A" is B's upline — no User row lookup should rescue this.
    expect(await resolveInviteRecruiter({ leaderId: "B", recruiterId: "A" })).toBe(
      "B",
    );
  });

  it("accepts an invite code belonging to someone in the branch", async () => {
    userFindUnique.mockResolvedValue({ id: "C" });

    expect(
      await resolveInviteRecruiter({ leaderId: "B", inviteCode: " abc123 " }),
    ).toBe("C");
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { inviteCode: "abc123" },
      select: { id: true },
    });
  });

  it("refuses an invite code belonging to someone outside the branch", async () => {
    userFindUnique.mockResolvedValue({ id: "S" });

    expect(
      await resolveInviteRecruiter({ leaderId: "B", inviteCode: "abc123" }),
    ).toBe("B");
  });

  it("falls back to the acting leader on an unknown or blank code", async () => {
    userFindUnique.mockResolvedValue(null);

    expect(
      await resolveInviteRecruiter({ leaderId: "B", inviteCode: "nope" }),
    ).toBe("B");
    expect(await resolveInviteRecruiter({ leaderId: "B" })).toBe("B");
  });
});

describe("createPendingInvite", () => {
  const input = {
    email: " Rani@Gmail.com ",
    recruiterId: "user_2",
    role: "agent" as const,
    invitedBy: "user_1",
  };

  it("creates the invite with a normalized email", async () => {
    userFindUnique.mockResolvedValue(null);
    inviteFindUnique.mockResolvedValue(null);
    inviteCreate.mockResolvedValue({ id: "invite_1" });

    expect(await createPendingInvite(input)).toEqual({
      ok: true,
      invite: { id: "invite_1" },
    });
    expect(inviteCreate).toHaveBeenCalledWith({
      data: {
        email: "rani@gmail.com",
        recruiterId: "user_2",
        role: "agent",
        invitedBy: "user_1",
      },
    });
  });

  it("refuses an email that already has an account", async () => {
    userFindUnique.mockResolvedValue({ id: "user_5" });

    expect(await createPendingInvite(input)).toEqual({
      ok: false,
      reason: "existing-user",
    });
    expect(inviteCreate).not.toHaveBeenCalled();
  });

  it("refuses an email that is already invited", async () => {
    userFindUnique.mockResolvedValue(null);
    inviteFindUnique.mockResolvedValue({ id: "invite_1" });

    expect(await createPendingInvite(input)).toEqual({
      ok: false,
      reason: "existing-invite",
    });
    expect(inviteCreate).not.toHaveBeenCalled();
  });

  it("turns a raced unique-constraint failure into the same duplicate result", async () => {
    userFindUnique.mockResolvedValue(null);
    inviteFindUnique.mockResolvedValue(null);
    inviteCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "7",
      }),
    );

    expect(await createPendingInvite(input)).toEqual({
      ok: false,
      reason: "existing-invite",
    });
  });

  it("still surfaces any other database error", async () => {
    userFindUnique.mockResolvedValue(null);
    inviteFindUnique.mockResolvedValue(null);
    inviteCreate.mockRejectedValue(new Error("connection lost"));

    await expect(createPendingInvite(input)).rejects.toThrow("connection lost");
  });
});

describe("daysWaiting", () => {
  const created = new Date("2026-07-20T09:00:00Z");

  it("counts whole days only", () => {
    expect(daysWaiting(created, new Date("2026-07-20T23:00:00Z"))).toBe(0);
    expect(daysWaiting(created, new Date("2026-07-21T10:00:00Z"))).toBe(1);
    expect(daysWaiting(created, new Date("2026-07-27T09:00:00Z"))).toBe(7);
  });

  it("never goes negative on a clock skew", () => {
    expect(daysWaiting(created, new Date("2026-07-19T09:00:00Z"))).toBe(0);
  });
});

describe("listPendingInvitesFor", () => {
  beforeEach(() => {
    // Self-inclusive, plus one recruit below the leader.
    getDescendantUserIds.mockResolvedValue(["leader_1", "agent_2"]);
  });

  it("scopes to the leader's whole branch, plus invites they made themselves", async () => {
    inviteFindMany.mockResolvedValue([]);

    await listPendingInvitesFor("leader_1");

    expect(getDescendantUserIds).toHaveBeenCalledWith("leader_1");
    expect(inviteFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { recruiterId: { in: ["leader_1", "agent_2"] } },
          { invitedBy: "leader_1" },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("resolves recruiter and inviter names, and flags the leader's own", async () => {
    const createdAt = new Date("2026-07-20T09:00:00Z");
    inviteFindMany.mockResolvedValue([
      {
        id: "invite_1",
        email: "baru@example.com",
        role: "agent",
        createdAt,
        recruiterId: "agent_2",
        invitedBy: "leader_1",
      },
      {
        id: "invite_2",
        email: "lain@example.com",
        role: "leader",
        createdAt,
        recruiterId: "agent_2",
        invitedBy: "agent_2",
      },
    ]);
    userFindMany.mockResolvedValue([
      { id: "agent_2", name: "Rani Putri" },
      { id: "leader_1", name: "Budi Santoso" },
    ]);

    const invites = await listPendingInvitesFor("leader_1");

    // One lookup for both columns, deduplicated.
    expect(userFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["agent_2", "leader_1"] } },
      select: { id: true, name: true },
    });
    expect(invites).toEqual([
      {
        id: "invite_1",
        email: "baru@example.com",
        role: "agent",
        createdAt,
        recruiterName: "Rani Putri",
        invitedByName: "Budi Santoso",
        invitedByYou: true,
      },
      {
        id: "invite_2",
        email: "lain@example.com",
        role: "leader",
        createdAt,
        recruiterName: "Rani Putri",
        invitedByName: "Rani Putri",
        invitedByYou: false,
      },
    ]);
  });

  it("tolerates the root bootstrap invite's null columns", async () => {
    inviteFindMany.mockResolvedValue([
      {
        id: "invite_root",
        email: "root@example.com",
        role: "leader",
        createdAt: new Date("2026-07-20T09:00:00Z"),
        recruiterId: null,
        invitedBy: null,
      },
    ]);

    const [invite] = await listPendingInvitesFor("leader_1");

    // Nothing to look up, so no query at all.
    expect(userFindMany).not.toHaveBeenCalled();
    expect(invite.recruiterName).toBeNull();
    expect(invite.invitedByName).toBeNull();
    expect(invite.invitedByYou).toBe(false);
  });

  it("shows B an invite A filed under B, naming A as the inviter", async () => {
    // A recruited B, B will recruit C. A adds C with recruiter = B, so the
    // invite reaches B through the recruiter match, not through invitedBy.
    // B's branch is just [B]: C has no User row until they first sign in, so
    // there's nothing below B for getDescendantUserIds to walk to yet.
    getDescendantUserIds.mockResolvedValue(["B"]);
    inviteFindMany.mockResolvedValue([
      {
        id: "invite_c",
        email: "c@example.com",
        role: "agent",
        createdAt: new Date("2026-07-22T09:00:00Z"),
        recruiterId: "B",
        invitedBy: "A",
      },
    ]);
    userFindMany.mockResolvedValue([
      { id: "B", name: "Bagus" },
      { id: "A", name: "Ayu" },
    ]);

    const [invite] = await listPendingInvitesFor("B");

    expect(inviteFindMany).toHaveBeenCalledWith({
      where: { OR: [{ recruiterId: { in: ["B"] } }, { invitedBy: "B" }] },
      orderBy: { createdAt: "desc" },
    });
    expect(invite.recruiterName).toBe("Bagus");
    expect(invite.invitedByName).toBe("Ayu");
    // Not B's own doing, so the row credits A rather than saying "kamu".
    expect(invite.invitedByYou).toBe(false);
  });
});
