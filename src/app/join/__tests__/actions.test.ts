import { beforeEach, describe, expect, test, vi } from "vitest";

const { createApplicant, resolvePengundangUnitLeaderId, revalidatePath, userExistsForEmail } =
  vi.hoisted(() => ({
    createApplicant: vi.fn(),
    resolvePengundangUnitLeaderId: vi.fn(),
    revalidatePath: vi.fn(),
    userExistsForEmail: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/applicant", () => ({ createApplicant }));
vi.mock("@/lib/memberIntake", () => ({ resolvePengundangUnitLeaderId }));
vi.mock("@/lib/invites", async () => {
  const actual = await vi.importActual<typeof import("@/lib/invites")>("@/lib/invites");
  return { ...actual, userExistsForEmail };
});

import { checkExistingMember, submitApplication } from "../actions";

const validInput = {
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
  ktpPhotoKey: "sub_1/ktp.jpg",
  selfiePhotoKey: "sub_1/selfie.jpg",
  familyCardPhotoKey: "sub_1/familyCard.jpg",
  savingsPhotoKey: "sub_1/savings.jpg",
  spousePhotoKey: null,
  pengundangUnit: "Robert / Lini",
};

beforeEach(() => {
  vi.clearAllMocks();
  resolvePengundangUnitLeaderId.mockResolvedValue("leader_1");
});

describe("submitApplication", () => {
  test("is reachable without any signed-in session — no auth mock needed at all", async () => {
    await submitApplication(validInput);

    expect(createApplicant).toHaveBeenCalledWith("leader_1", {
      fullName: validInput.fullName,
      ktpNumber: validInput.ktpNumber,
      birthPlace: validInput.birthPlace,
      birthDate: validInput.birthDate,
      activeEmail: validInput.activeEmail,
      activePhone: validInput.activePhone,
      address: validInput.address,
      education: validInput.education,
      schoolName: validInput.schoolName,
      schoolCity: validInput.schoolCity,
      graduationYear: validInput.graduationYear,
      ktpPhotoKey: validInput.ktpPhotoKey,
      selfiePhotoKey: validInput.selfiePhotoKey,
      familyCardPhotoKey: validInput.familyCardPhotoKey,
      savingsPhotoKey: validInput.savingsPhotoKey,
      spousePhotoKey: validInput.spousePhotoKey,
      pengundangUnit: validInput.pengundangUnit,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/member/admin/add-member");
  });

  test.each([
    ["fullName", "Nama lengkap wajib diisi."],
    ["ktpNumber", "Nomor KTP wajib diisi."],
    ["birthPlace", "Tempat lahir wajib diisi."],
    ["activeEmail", "Email aktif wajib diisi."],
    ["activePhone", "No HP aktif wajib diisi."],
    ["address", "Alamat domisili wajib diisi."],
    ["schoolName", "Nama sekolah/universitas wajib diisi."],
    ["schoolCity", "Kota sekolah/universitas wajib diisi."],
    ["graduationYear", "Tahun kelulusan wajib diisi."],
  ] as const)("rejects an empty %s before touching the database", async (field, message) => {
    await expect(submitApplication({ ...validInput, [field]: "  " })).rejects.toThrow(message);
    expect(createApplicant).not.toHaveBeenCalled();
  });

  test("rejects a malformed active email", async () => {
    await expect(
      submitApplication({ ...validInput, activeEmail: "not-an-email" }),
    ).rejects.toThrow("Format email aktif belum bener.");
    expect(createApplicant).not.toHaveBeenCalled();
  });

  test("rejects a missing or unparseable birth date", async () => {
    await expect(
      submitApplication({ ...validInput, birthDate: "not-a-date" }),
    ).rejects.toThrow("Tanggal lahir wajib diisi.");
    expect(createApplicant).not.toHaveBeenCalled();
  });

  test("rejects when Pengundang / Unit can't be resolved to a real leader", async () => {
    resolvePengundangUnitLeaderId.mockResolvedValue(null);

    await expect(submitApplication(validInput)).rejects.toThrow(
      "Pengundang / Unit wajib dipilih.",
    );
    expect(createApplicant).not.toHaveBeenCalled();
  });

  test.each([
    ["ktpPhotoKey", "Foto KTP belum berhasil diupload."],
    ["selfiePhotoKey", "Foto Selfie belum berhasil diupload."],
    ["familyCardPhotoKey", "Kartu Keluarga belum berhasil diupload."],
    ["savingsPhotoKey", "Foto buku tabungan/rekening koran belum berhasil diupload."],
  ] as const)("rejects a missing required photo key: %s", async (field, message) => {
    await expect(submitApplication({ ...validInput, [field]: "" })).rejects.toThrow(message);
    expect(createApplicant).not.toHaveBeenCalled();
  });

  test("rejects photo keys that don't share the same submission prefix", async () => {
    await expect(
      submitApplication({ ...validInput, selfiePhotoKey: "sub_2/selfie.jpg" }),
    ).rejects.toThrow("Foto Selfie belum berhasil diupload.");
    expect(createApplicant).not.toHaveBeenCalled();
  });

  test("allows a null spousePhotoKey (only required if married)", async () => {
    await submitApplication({ ...validInput, spousePhotoKey: null });

    expect(createApplicant).toHaveBeenCalled();
  });

  test("rejects a spousePhotoKey outside the submission's own prefix when provided", async () => {
    await expect(
      submitApplication({ ...validInput, spousePhotoKey: "sub_2/spouse.jpg" }),
    ).rejects.toThrow("Foto KTP Pasangan belum berhasil diupload.");
    expect(createApplicant).not.toHaveBeenCalled();
  });
});

describe("checkExistingMember", () => {
  test("delegates to userExistsForEmail with the trimmed address", async () => {
    userExistsForEmail.mockResolvedValue(true);

    expect(await checkExistingMember("  rani@example.com ")).toBe(true);
    expect(userExistsForEmail).toHaveBeenCalledWith("rani@example.com");
  });

  test("is false when the email belongs to nobody", async () => {
    userExistsForEmail.mockResolvedValue(false);

    expect(await checkExistingMember("rani@example.com")).toBe(false);
  });

  test.each(["", "   ", "not-an-email"])(
    "answers false for %j without hitting the database",
    async (value) => {
      expect(await checkExistingMember(value)).toBe(false);
      expect(userExistsForEmail).not.toHaveBeenCalled();
    },
  );
});
