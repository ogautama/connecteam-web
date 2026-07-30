import { beforeEach, describe, expect, test, vi } from "vitest";

const { create: applicantCreate, findMany: applicantFindMany, findUnique: applicantFindUnique, update: applicantUpdate } =
  vi.hoisted(() => ({
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  }));
const { getDescendantUserIds } = vi.hoisted(() => ({ getDescendantUserIds: vi.fn() }));
const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    applicant: {
      create: applicantCreate,
      findMany: applicantFindMany,
      findUnique: applicantFindUnique,
      update: applicantUpdate,
    },
  },
}));
vi.mock("@/lib/recruitTree", () => ({ getDescendantUserIds }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

import { createApplicant, listApplicantsFor, setApplicantStatus } from "@/lib/applicant";

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
  ktpPhotoKey: "sub_1/ktp.jpg",
  selfiePhotoKey: "sub_1/selfie.jpg",
  familyCardPhotoKey: "sub_1/familyCard.jpg",
  savingsPhotoKey: "sub_1/savings.jpg",
  spousePhotoKey: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/file" } });
});

describe("createApplicant", () => {
  test("creates a row scoped to the resolved recruiterId, parsing birthDate", async () => {
    await createApplicant("leader_1", input);

    expect(applicantCreate).toHaveBeenCalledWith({
      data: {
        recruiterId: "leader_1",
        fullName: input.fullName,
        ktpNumber: input.ktpNumber,
        birthPlace: input.birthPlace,
        birthDate: new Date("1998-05-10"),
        activeEmail: input.activeEmail,
        activePhone: input.activePhone,
        address: input.address,
        education: input.education,
        schoolName: input.schoolName,
        graduationYear: input.graduationYear,
        ktpPhotoKey: input.ktpPhotoKey,
        selfiePhotoKey: input.selfiePhotoKey,
        familyCardPhotoKey: input.familyCardPhotoKey,
        savingsPhotoKey: input.savingsPhotoKey,
        spousePhotoKey: input.spousePhotoKey,
      },
    });
  });
});

describe("listApplicantsFor", () => {
  test("scopes to submitted applications within the leader's branch, signing photo URLs", async () => {
    getDescendantUserIds.mockResolvedValue(["leader_1", "agent_1"]);
    applicantFindMany.mockResolvedValue([
      {
        id: "applicant_1",
        status: "submitted",
        createdAt: new Date("2026-07-29T00:00:00.000Z"),
        fullName: "Rani Putri",
        activeEmail: "rani@example.com",
        activePhone: "081234567890",
        birthPlace: "Jakarta",
        birthDate: new Date("1998-05-10T00:00:00.000Z"),
        address: "Jl. Sudirman No. 1",
        education: "s1",
        schoolName: "Universitas Indonesia",
        graduationYear: "2020",
        ktpPhotoKey: "sub_1/ktp.jpg",
        selfiePhotoKey: "sub_1/selfie.jpg",
        familyCardPhotoKey: "sub_1/familyCard.jpg",
        savingsPhotoKey: "sub_1/savings.jpg",
        spousePhotoKey: null,
        recruiter: { name: "Budi Santoso" },
      },
    ]);

    const result = await listApplicantsFor("leader_1");

    expect(applicantFindMany).toHaveBeenCalledWith({
      where: { status: "submitted", recruiterId: { in: ["leader_1", "agent_1"] } },
      orderBy: { createdAt: "desc" },
      include: { recruiter: { select: { name: true } } },
    });
    expect(result).toHaveLength(1);
    expect(result[0].recruiterName).toBe("Budi Santoso");
    expect(result[0].birthDate).toBe("1998-05-10");
    expect(result[0].ktpPhotoUrl).toBe("https://signed.example/file");
    expect(result[0].spousePhotoUrl).toBeNull();
  });
});

describe("setApplicantStatus", () => {
  test("updates status when the applicant is within the leader's branch", async () => {
    applicantFindUnique.mockResolvedValue({ recruiterId: "agent_1" });
    getDescendantUserIds.mockResolvedValue(["leader_1", "agent_1"]);

    const ok = await setApplicantStatus("leader_1", "applicant_1", "accepted");

    expect(ok).toBe(true);
    expect(applicantUpdate).toHaveBeenCalledWith({
      where: { id: "applicant_1" },
      data: { status: "accepted" },
    });
  });

  test("refuses when the applicant's recruiter is outside the leader's branch", async () => {
    applicantFindUnique.mockResolvedValue({ recruiterId: "outsider" });
    getDescendantUserIds.mockResolvedValue(["leader_1", "agent_1"]);

    const ok = await setApplicantStatus("leader_1", "applicant_1", "rejected");

    expect(ok).toBe(false);
    expect(applicantUpdate).not.toHaveBeenCalled();
  });

  test("returns false when the applicant doesn't exist", async () => {
    applicantFindUnique.mockResolvedValue(null);

    const ok = await setApplicantStatus("leader_1", "nope", "accepted");

    expect(ok).toBe(false);
    expect(applicantUpdate).not.toHaveBeenCalled();
  });
});
