import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { userFindUnique, userFindMany, inviteFindUnique, inviteCreate, resolveRecruiter } =
  vi.hoisted(() => ({
    userFindUnique: vi.fn(),
    userFindMany: vi.fn(),
    inviteFindUnique: vi.fn(),
    inviteCreate: vi.fn(),
    resolveRecruiter: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, findMany: userFindMany },
    pendingInvite: { findUnique: inviteFindUnique, create: inviteCreate },
  },
}));

vi.mock("@/lib/recruitTree", () => ({ resolveRecruiter }));

import {
  createPendingInvite,
  isValidEmail,
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

describe("resolveInviteRecruiter", () => {
  it("uses the picked recruiter when it exists", async () => {
    userFindUnique.mockResolvedValue({ id: "user_2" });

    expect(await resolveInviteRecruiter({ recruiterId: "user_2" })).toBe("user_2");
    expect(resolveRecruiter).not.toHaveBeenCalled();
  });

  it("falls back to the invite code when nothing was picked", async () => {
    resolveRecruiter.mockResolvedValue("user_9");

    expect(await resolveInviteRecruiter({ inviteCode: " abc123 " })).toBe("user_9");
    expect(resolveRecruiter).toHaveBeenCalledWith("abc123");
  });

  it("lets resolveRecruiter fall back to root on a blank code", async () => {
    resolveRecruiter.mockResolvedValue("user_root");

    expect(await resolveInviteRecruiter({})).toBe("user_root");
    expect(resolveRecruiter).toHaveBeenCalledWith(undefined);
  });

  it("falls back rather than trusting a recruiterId that no longer exists", async () => {
    userFindUnique.mockResolvedValue(null);
    resolveRecruiter.mockResolvedValue("user_root");

    expect(await resolveInviteRecruiter({ recruiterId: "gone" })).toBe("user_root");
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
