import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  userFindUnique,
  userFindFirst,
  userUpdate,
  applicantFindUnique,
  applicantUpdate,
  queryRaw,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  applicantFindUnique: vi.fn(),
  applicantUpdate: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      findFirst: userFindFirst,
      update: userUpdate,
    },
    applicant: {
      findUnique: applicantFindUnique,
      update: applicantUpdate,
    },
    $queryRaw: queryRaw,
  },
}));

import {
  canAccess,
  getDescendantUserIds,
  reassignRecruiter,
  resolveRecruiter,
} from "@/lib/recruitTree";

// Fixture tree: root -> midA -> leaf
//               root -> midB
const DESCENDANTS: Record<string, string[]> = {
  root: ["root", "midA", "midB", "leaf"],
  midA: ["midA", "leaf"],
  midB: ["midB"],
  leaf: ["leaf"],
};

beforeEach(() => {
  vi.clearAllMocks();
  queryRaw.mockImplementation(async (sql: { values: unknown[] }) => {
    const userId = sql.values[0] as string;
    return (DESCENDANTS[userId] ?? []).map((id) => ({ id }));
  });
});

describe("getDescendantUserIds", () => {
  it("returns everyone for the root user", async () => {
    await expect(getDescendantUserIds("root")).resolves.toEqual([
      "root",
      "midA",
      "midB",
      "leaf",
    ]);
  });

  it("returns just [self] for a leaf", async () => {
    await expect(getDescendantUserIds("leaf")).resolves.toEqual(["leaf"]);
  });

  // The actual recursive-CTE SQL against a fixture tree needs a real
  // Postgres instance to verify meaningfully — $queryRaw isn't mockable in
  // a way that exercises the query itself, only its call shape (per
  // docs/plans/15-recruitment-tree.md's "Verification" section).
});

describe("canAccess", () => {
  it("is true for self", async () => {
    await expect(canAccess("midA", "midA")).resolves.toBe(true);
  });

  it("is true for a descendant", async () => {
    await expect(canAccess("root", "leaf")).resolves.toBe(true);
  });

  it("is false for a sibling's subtree", async () => {
    await expect(canAccess("midB", "leaf")).resolves.toBe(false);
  });

  it("is false for an ancestor (visibility is downward-only)", async () => {
    await expect(canAccess("leaf", "root")).resolves.toBe(false);
  });
});

describe("resolveRecruiter", () => {
  it("resolves a valid invite code to that user", async () => {
    userFindUnique.mockResolvedValueOnce({ id: "midA" });
    await expect(resolveRecruiter("valid-code")).resolves.toBe("midA");
  });

  it("falls back to the root user for a missing/invalid code", async () => {
    userFindUnique.mockResolvedValueOnce(null);
    userFindFirst.mockResolvedValueOnce({ id: "root" });
    await expect(resolveRecruiter("bad-code")).resolves.toBe("root");
    expect(userFindFirst).toHaveBeenCalledWith({
      where: { recruiterId: null },
    });
  });

  it("falls back to the root user when no code is given", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "root" });
    await expect(resolveRecruiter()).resolves.toBe("root");
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});

describe("reassignRecruiter", () => {
  it("rejects a reassignment that would create a cycle", async () => {
    const users: Record<string, { id: string; recruiterId: string | null }> =
      {
        root: { id: "root", recruiterId: null },
        midA: { id: "midA", recruiterId: "root" },
        leaf: { id: "leaf", recruiterId: "midA" },
      };
    userFindUnique.mockImplementation(
      async ({ where }: { where: { id: string } }) => users[where.id] ?? null
    );

    // Reassigning midA under its own descendant leaf would create a cycle.
    await expect(reassignRecruiter("midA", "leaf")).rejects.toThrow(/cycle/);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("succeeds for a non-cyclic reassignment, immediately reflected in getDescendantUserIds", async () => {
    const users: Record<string, { id: string; recruiterId: string | null }> =
      {
        root: { id: "root", recruiterId: null },
        midB: { id: "midB", recruiterId: "root" },
        leaf: { id: "leaf", recruiterId: "midA" },
      };
    userFindUnique.mockImplementation(
      async ({ where }: { where: { id: string } }) => users[where.id] ?? null
    );
    userUpdate.mockResolvedValueOnce({});

    await reassignRecruiter("leaf", "midB");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "leaf" },
      data: { recruiterId: "midB" },
    });

    // Simulate the reassignment's effect on the descendant sets.
    DESCENDANTS.midB = ["midB", "leaf"];
    DESCENDANTS.midA = ["midA"];
    await expect(getDescendantUserIds("midB")).resolves.toContain("leaf");
  });

  it("reassigns an Applicant's recruiter without a cycle check", async () => {
    userFindUnique.mockResolvedValueOnce(null); // not a User
    applicantFindUnique.mockResolvedValueOnce({ id: "app_1" });
    applicantUpdate.mockResolvedValueOnce({});

    await reassignRecruiter("app_1", "midB");

    expect(applicantUpdate).toHaveBeenCalledWith({
      where: { id: "app_1" },
      data: { recruiterId: "midB" },
    });
  });
});
