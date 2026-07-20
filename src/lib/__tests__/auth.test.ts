import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const { findUnique, getUser } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique },
  },
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

import { getCurrentUser, getSession, requireRoleTarget } from "@/lib/auth";

const supabaseUser = {
  id: "user_1",
  email: "agent@example.com",
} as unknown as SupabaseUser;
const profile = { id: "user_1", role: "agent" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  it("returns the Supabase user when a session exists", async () => {
    getUser.mockResolvedValueOnce({ data: { user: supabaseUser } });
    await expect(getSession()).resolves.toEqual(supabaseUser);
  });

  it("returns null when there is no session", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("getCurrentUser", () => {
  it("returns {id, role} for a session with a matching public.User row", async () => {
    getUser.mockResolvedValueOnce({ data: { user: supabaseUser } });
    findUnique.mockResolvedValueOnce(profile);

    await expect(getCurrentUser()).resolves.toEqual(profile);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { id: true, role: true },
    });
  });

  it("returns null for a session with no matching row (never invited)", async () => {
    getUser.mockResolvedValueOnce({ data: { user: supabaseUser } });
    findUnique.mockResolvedValueOnce(null);

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when there is no session", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("requireRoleTarget", () => {
  it("sends unauthenticated requests to /login", () => {
    expect(requireRoleTarget(null, null, "leader")).toBe("/login");
  });

  it("sends an authenticated session with no profile to /not-invited", () => {
    expect(requireRoleTarget(supabaseUser, null, "leader")).toBe(
      "/not-invited"
    );
  });

  it("rejects the wrong role to /member", () => {
    expect(requireRoleTarget(supabaseUser, profile, "leader")).toBe(
      "/member"
    );
  });

  it("passes a matching role through", () => {
    expect(
      requireRoleTarget(supabaseUser, { id: "user_1", role: "leader" }, "leader")
    ).toBeNull();
  });
});
