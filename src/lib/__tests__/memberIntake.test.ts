import { beforeEach, describe, expect, test, vi } from "vitest";

const { findUnique: intakeFindUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
const {
  findMany: userFindMany,
  findFirst: userFindFirst,
  findUnique: userFindUnique,
} = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
}));
const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    memberIntake: { findUnique: intakeFindUnique, upsert },
    user: { findMany: userFindMany, findFirst: userFindFirst, findUnique: userFindUnique },
  },
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

import {
  getMemberIntake,
  getPengundangUnitForMember,
  getPengundangUnitOptions,
  resolvePengundangUnitLeaderId,
  upsertMemberIntake,
} from "@/lib/memberIntake";

const savedRow = {
  fullName: "Rani Putri",
  ktpNumber: "1234567890123456",
  birthPlace: "Jakarta",
  birthDate: new Date("1998-05-10T00:00:00.000Z"),
  activeEmail: "rani@example.com",
  activePhone: "081234567890",
  address: "Jl. Sudirman No. 1",
  education: "s1" as const,
  schoolName: "Universitas Indonesia",
  schoolCity: "Jakarta",
  graduationYear: "2020",
  ktpPhotoKey: "user_1/ktp.jpg",
  selfiePhotoKey: "user_1/selfie.jpg",
  familyCardPhotoKey: "user_1/familyCard.jpg",
  savingsPhotoKey: "user_1/savings.jpg",
  spousePhotoKey: null,
  pengundangUnit: "Robert / Lini",
};

const input = {
  fullName: "Rani Putri",
  ktpNumber: "1234567890123456",
  birthPlace: "Jakarta",
  birthDate: "1998-05-10",
  activeEmail: "rani@example.com",
  activePhone: "081234567890",
  address: "Jl. Sudirman No. 1",
  education: "s1" as const,
  schoolName: "Universitas Indonesia",
  schoolCity: "Jakarta",
  graduationYear: "2020",
  ktpPhotoKey: "user_1/ktp.jpg",
  selfiePhotoKey: "user_1/selfie.jpg",
  familyCardPhotoKey: "user_1/familyCard.jpg",
  savingsPhotoKey: "user_1/savings.jpg",
  spousePhotoKey: null,
  pengundangUnit: "Robert / Lini",
};

beforeEach(() => {
  vi.clearAllMocks();
  createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/file" } });
});

describe("getMemberIntake", () => {
  test("returns null when the member hasn't submitted yet", async () => {
    intakeFindUnique.mockResolvedValue(null);

    expect(await getMemberIntake("user_1")).toBeNull();
    expect(intakeFindUnique).toHaveBeenCalledWith({ where: { userId: "user_1" } });
  });

  test("formats birthDate back to a plain YYYY-MM-DD string", async () => {
    intakeFindUnique.mockResolvedValue(savedRow);

    const result = await getMemberIntake("user_1");

    expect(result?.birthDate).toBe("1998-05-10");
    expect(result?.ktpNumber).toBe("1234567890123456");
  });

  test("signs a URL for each photo key present", async () => {
    intakeFindUnique.mockResolvedValue(savedRow);

    const result = await getMemberIntake("user_1");

    expect(result?.ktpPhotoUrl).toBe("https://signed.example/file");
    expect(result?.spousePhotoUrl).toBeNull();
    // 4 required photos signed, spouse skipped since its key is null.
    expect(createSignedUrl).toHaveBeenCalledTimes(4);
  });
});

describe("upsertMemberIntake", () => {
  test("upserts scoped to the given user, parsing birthDate into a Date", async () => {
    await upsertMemberIntake("user_1", input);

    expect(upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      update: { ...input, birthDate: new Date("1998-05-10") },
      create: { userId: "user_1", ...input, birthDate: new Date("1998-05-10") },
    });
  });
});

describe("getPengundangUnitOptions", () => {
  test("returns every leader's name, not a fixed list", async () => {
    userFindMany.mockResolvedValue([{ name: "Budi Santoso" }, { name: "Zaki Firmansyah" }]);

    expect(await getPengundangUnitOptions()).toEqual(["Budi Santoso", "Zaki Firmansyah"]);
    expect(userFindMany).toHaveBeenCalledWith({
      where: { role: "leader" },
      select: { name: true },
      orderBy: { name: "asc" },
    });
  });

  test("returns an empty list when there are no leaders", async () => {
    userFindMany.mockResolvedValue([]);

    expect(await getPengundangUnitOptions()).toEqual([]);
  });
});

describe("resolvePengundangUnitLeaderId", () => {
  test("returns the id of the leader matching the chosen name", async () => {
    userFindFirst.mockResolvedValue({ id: "leader_1" });

    expect(await resolvePengundangUnitLeaderId("Robert / Lini")).toBe("leader_1");
    expect(userFindFirst).toHaveBeenCalledWith({
      where: { role: "leader", name: "Robert / Lini" },
      select: { id: true },
    });
  });

  test("returns null when no leader matches", async () => {
    userFindFirst.mockResolvedValue(null);

    expect(await resolvePengundangUnitLeaderId("Nobody")).toBeNull();
  });
});

describe("getPengundangUnitForMember", () => {
  // The mock speaks the helper's two query shapes: a {recruiterId} select
  // for the member/cursor and an {id,name,role} select for the recruiter.
  function seedTree(users: Record<string, { recruiterId?: string | null; name?: string; role?: string }>) {
    userFindUnique.mockImplementation(({ where, select }: { where: { id: string }; select: Record<string, boolean> }) => {
      const user = users[where.id];
      if (!user) return Promise.resolve(null);
      if (select.recruiterId) return Promise.resolve({ recruiterId: user.recruiterId ?? null });
      return Promise.resolve({ id: where.id, name: user.name, role: user.role });
    });
  }

  test("returns the recruiter's name when the recruiter is a leader", async () => {
    seedTree({
      agent_1: { recruiterId: "leader_1" },
      leader_1: { name: "Robert / Lini", role: "leader" },
    });

    expect(await getPengundangUnitForMember("agent_1")).toBe("Robert / Lini");
  });

  test("walks past an agent recruiter up to the unit's leader", async () => {
    // The Pengundang/Unit ≠ recruiter distinction: an Add Member invite may
    // name an agent as recruiter, but the unit is that agent's leader.
    seedTree({
      agent_2: { recruiterId: "agent_1" },
      agent_1: { name: "Kak Sinta", role: "agent", recruiterId: "leader_1" },
      leader_1: { name: "Robert / Lini", role: "leader" },
    });

    expect(await getPengundangUnitForMember("agent_2")).toBe("Robert / Lini");
  });

  test("returns null for the bootstrap root, who has no recruiter", async () => {
    seedTree({ root: { recruiterId: null } });

    expect(await getPengundangUnitForMember("root")).toBeNull();
  });

  test("a corrupt recruiter cycle returns null instead of hanging", async () => {
    seedTree({
      agent_1: { recruiterId: "agent_2", name: "A", role: "agent" },
      agent_2: { recruiterId: "agent_1", name: "B", role: "agent" },
    });

    expect(await getPengundangUnitForMember("agent_1")).toBeNull();
  });
});
