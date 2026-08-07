import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: userFindUnique } },
}));

import { getReferrerFirstName } from "@/lib/referrer";

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
