import { beforeEach, describe, expect, test, vi } from "vitest";

const { findUnique: intakeFindUnique, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    memberIntake: { findUnique: intakeFindUnique, upsert },
  },
}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

import { getMemberIntake, upsertMemberIntake } from "@/lib/memberIntake";

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
