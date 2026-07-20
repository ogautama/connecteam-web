import { describe, expect, it, vi } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique, update },
  },
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(async (password: string, hash: string) =>
    password === "correct-password" && hash === "hashed"
  ),
}));

import {
  authorizeCredentials,
  deactivateUser,
  refreshOrRevokeToken,
  roleRedirectTarget,
} from "@/lib/auth";

const baseUser = {
  id: "user_1",
  email: "agent@example.com",
  name: "Agent",
  passwordHash: "hashed",
  role: "agent" as const,
  createdAt: new Date(),
  position: "Agent" as const,
  status: "active" as const,
  inviteCode: "invite_1",
  recruiterId: null,
};

describe("authorizeCredentials", () => {
  it("returns the user (without passwordHash) for valid credentials", async () => {
    findUnique.mockResolvedValueOnce(baseUser);

    const result = await authorizeCredentials({
      email: "agent@example.com",
      password: "correct-password",
    });

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("passwordHash");
    expect(result?.id).toBe("user_1");
  });

  it("returns null for an unknown email", async () => {
    findUnique.mockResolvedValueOnce(null);

    const result = await authorizeCredentials({
      email: "nobody@example.com",
      password: "whatever",
    });

    expect(result).toBeNull();
  });

  it("returns null for the wrong password", async () => {
    findUnique.mockResolvedValueOnce(baseUser);

    const result = await authorizeCredentials({
      email: "agent@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  it("returns null for an inactive user even with correct credentials", async () => {
    findUnique.mockResolvedValueOnce({ ...baseUser, status: "inactive" });

    const result = await authorizeCredentials({
      email: "agent@example.com",
      password: "correct-password",
    });

    expect(result).toBeNull();
  });
});

describe("refreshOrRevokeToken", () => {
  it("stamps sub/role onto the token at sign-in", async () => {
    const token = {};
    const result = await refreshOrRevokeToken(token, {
      id: "user_1",
      role: "agent",
    });
    expect(result).toEqual({ sub: "user_1", role: "agent" });
  });

  it("keeps a valid token for an active user on later requests", async () => {
    findUnique.mockResolvedValueOnce({ ...baseUser, status: "active" });
    const token = { sub: "user_1" };
    const result = await refreshOrRevokeToken(token, undefined);
    expect(result).toEqual({ sub: "user_1", role: "agent" });
  });

  it("clears the token (revokes the session) once the user is deactivated", async () => {
    findUnique.mockResolvedValueOnce({ ...baseUser, status: "inactive" });
    const token = { sub: "user_1" };
    await expect(refreshOrRevokeToken(token, undefined)).resolves.toBeNull();
  });
});

describe("deactivateUser", () => {
  it("sets status to inactive", async () => {
    update.mockResolvedValueOnce({});
    await deactivateUser("user_1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { status: "inactive" },
    });
  });
});

describe("roleRedirectTarget", () => {
  it("sends unauthenticated requests to /login", () => {
    expect(roleRedirectTarget(null, "leader")).toBe("/login");
  });

  it("rejects an authenticated agent from a leader-only route", () => {
    const session = {
      user: { id: "u1", role: "agent" as const },
      expires: "2099-01-01",
    };
    expect(roleRedirectTarget(session, "leader")).toBe("/member");
  });

  it("passes an authenticated leader through to a leader-only route", () => {
    const session = {
      user: { id: "u1", role: "leader" as const },
      expires: "2099-01-01",
    };
    expect(roleRedirectTarget(session, "leader")).toBeNull();
  });
});
