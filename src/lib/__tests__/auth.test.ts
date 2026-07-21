import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const { findUnique, getUser, redirect } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getUser: vi.fn(),
  // Stands in for Next's redirect(), which throws rather than returning —
  // requireMember/requireRole rely on that to stop before returning a user.
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique },
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("next/navigation", () => ({ redirect }));

import {
  getCurrentUser,
  getSession,
  requireMember,
  requireMemberTarget,
  requireRoleTarget,
} from "@/lib/auth";

const supabaseUser = {
  id: "user_1",
  email: "agent@example.com",
} as unknown as SupabaseUser;
const profile = { id: "user_1", name: "Rani Putri", role: "agent" as const };

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
      select: { id: true, name: true, role: true },
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

describe("requireMemberTarget", () => {
  it("sends unauthenticated requests to /login", () => {
    expect(requireMemberTarget(null, null)).toBe("/login");
  });

  it("sends an authenticated session with no profile to /not-invited", () => {
    expect(requireMemberTarget(supabaseUser, null)).toBe("/not-invited");
  });

  it("passes either role through", () => {
    expect(requireMemberTarget(supabaseUser, profile)).toBeNull();
    expect(
      requireMemberTarget(supabaseUser, { ...profile, role: "leader" })
    ).toBeNull();
  });
});

// The /member/** gate as the shell's layout actually calls it (Plan 06) —
// proxy.ts makes the same decision one layer out, see proxy.test.ts.
describe("requireMember", () => {
  it("redirects an unauthenticated visit to /login", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(requireMember()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("redirects a signed-in Google account with no profile to /not-invited", async () => {
    getUser.mockResolvedValueOnce({ data: { user: supabaseUser } });
    findUnique.mockResolvedValueOnce(null);

    await expect(requireMember()).rejects.toThrow("NEXT_REDIRECT:/not-invited");
    expect(redirect).toHaveBeenCalledWith("/not-invited");
  });

  it("returns the profile for an invited agent", async () => {
    getUser.mockResolvedValueOnce({ data: { user: supabaseUser } });
    findUnique.mockResolvedValueOnce(profile);

    await expect(requireMember()).resolves.toEqual(profile);
    expect(redirect).not.toHaveBeenCalled();
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
      requireRoleTarget(supabaseUser, { ...profile, role: "leader" }, "leader")
    ).toBeNull();
  });
});
