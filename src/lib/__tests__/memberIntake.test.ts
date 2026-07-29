import { beforeEach, describe, expect, test, vi } from "vitest";

const { findUnique: intakeFindUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
const { findUnique: userFindUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    memberIntake: { findUnique: intakeFindUnique, upsert },
    user: { findUnique: userFindUnique },
  },
}));

import { getMemberIntake, getUnitPengundang, upsertMemberIntake } from "@/lib/memberIntake";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMemberIntake", () => {
  test("returns null when the member hasn't submitted yet", async () => {
    intakeFindUnique.mockResolvedValue(null);

    expect(await getMemberIntake("user_1")).toBeNull();
    expect(intakeFindUnique).toHaveBeenCalledWith({ where: { userId: "user_1" } });
  });

  test("formats birthDate back to a plain YYYY-MM-DD string", async () => {
    intakeFindUnique.mockResolvedValue({
      ktpNumber: "1234567890123456",
      birthDate: new Date("1998-05-10T00:00:00.000Z"),
      phone: "081234567890",
      bankAccount: "9988776655",
      npwp: "12.345.678.9-012.000",
    });

    const result = await getMemberIntake("user_1");

    expect(result?.birthDate).toBe("1998-05-10");
    expect(result?.ktpNumber).toBe("1234567890123456");
  });
});

describe("upsertMemberIntake", () => {
  test("upserts scoped to the given user, parsing birthDate into a Date", async () => {
    const input = {
      ktpNumber: "1234567890123456",
      birthDate: "1998-05-10",
      phone: "081234567890",
      bankAccount: "9988776655",
      npwp: "12.345.678.9-012.000",
    };

    await upsertMemberIntake("user_1", input);

    expect(upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      update: { ...input, birthDate: new Date("1998-05-10") },
      create: { userId: "user_1", ...input, birthDate: new Date("1998-05-10") },
    });
  });
});

describe("getUnitPengundang", () => {
  test("returns the recruiter's name", async () => {
    userFindUnique.mockResolvedValue({ recruiter: { name: "Budi Santoso" } });

    expect(await getUnitPengundang("user_1")).toBe("Budi Santoso");
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { recruiter: { select: { name: true } } },
    });
  });

  test("returns null for the root user, who has no recruiter", async () => {
    userFindUnique.mockResolvedValue({ recruiter: null });

    expect(await getUnitPengundang("root_user")).toBeNull();
  });
});
