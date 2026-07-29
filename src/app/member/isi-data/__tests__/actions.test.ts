import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  requireMember,
  upsertMemberIntake,
  getMemberIntake,
  getPengundangUnitOptions,
  resolvePengundangUnitLeaderId,
  setItemCompletion,
  revalidatePath,
  createPendingInvite,
} = vi.hoisted(() => ({
  requireMember: vi.fn(),
  upsertMemberIntake: vi.fn(),
  getMemberIntake: vi.fn(),
  getPengundangUnitOptions: vi.fn(),
  resolvePengundangUnitLeaderId: vi.fn(),
  setItemCompletion: vi.fn(),
  revalidatePath: vi.fn(),
  createPendingInvite: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/memberIntake", () => ({
  upsertMemberIntake,
  getMemberIntake,
  getPengundangUnitOptions,
  resolvePengundangUnitLeaderId,
}));
vi.mock("@/lib/onboardingProgress", () => ({ setItemCompletion }));
vi.mock("@/lib/invites", async () => {
  const actual = await vi.importActual<typeof import("@/lib/invites")>("@/lib/invites");
  return { ...actual, createPendingInvite };
});

import { submitJoinData } from "../actions";

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
  graduationYear: "2020",
  ktpPhotoKey: "user_1/ktp.jpg",
  selfiePhotoKey: "user_1/selfie.jpg",
  familyCardPhotoKey: "user_1/familyCard.jpg",
  savingsPhotoKey: "user_1/savings.jpg",
  spousePhotoKey: null,
  pengundangUnit: "Robert / Lini",
};

const savedRecord = { ...validInput, ktpPhotoUrl: null, selfiePhotoUrl: null, familyCardPhotoUrl: null, savingsPhotoUrl: null, spousePhotoUrl: null };

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue({
    id: "user_1",
    name: "Rani Putri",
    email: "rani@example.com",
    role: "agent",
  });
  getMemberIntake.mockResolvedValue(savedRecord);
  getPengundangUnitOptions.mockResolvedValue(["Robert / Lini", "Haryo / Daisy"]);
  resolvePengundangUnitLeaderId.mockResolvedValue("leader_1");
  createPendingInvite.mockResolvedValue({ ok: true, invite: {} });
});

describe("submitJoinData", () => {
  test("saves the intake data, marks the checklist item done, and returns the persisted record", async () => {
    const result = await submitJoinData(validInput);

    expect(upsertMemberIntake).toHaveBeenCalledWith("user_1", validInput);
    expect(setItemCompletion).toHaveBeenCalledWith("user_1", "join-isi-data", true);
    expect(revalidatePath).toHaveBeenCalledWith("/member/onboarding");
    expect(revalidatePath).toHaveBeenCalledWith("/member/isi-data");
    expect(result).toEqual(savedRecord);
  });

  test("trims whitespace before saving", async () => {
    await submitJoinData({ ...validInput, activePhone: "  081234567890  " });

    expect(upsertMemberIntake).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ activePhone: "081234567890" }),
    );
  });

  test.each([
    ["fullName", "Nama lengkap wajib diisi."],
    ["ktpNumber", "Nomor KTP wajib diisi."],
    ["birthPlace", "Tempat lahir wajib diisi."],
    ["activeEmail", "Email aktif wajib diisi."],
    ["activePhone", "No HP aktif wajib diisi."],
    ["address", "Alamat domisili wajib diisi."],
    ["schoolName", "Nama sekolah/universitas wajib diisi."],
    ["graduationYear", "Tahun kelulusan wajib diisi."],
  ] as const)("rejects an empty %s before touching the database", async (field, message) => {
    await expect(submitJoinData({ ...validInput, [field]: "  " })).rejects.toThrow(message);
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("rejects a missing or unparseable birth date", async () => {
    await expect(
      submitJoinData({ ...validInput, birthDate: "not-a-date" }),
    ).rejects.toThrow("Tanggal lahir wajib diisi.");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("rejects a Pengundang / Unit value outside the live leader list", async () => {
    await expect(
      submitJoinData({ ...validInput, pengundangUnit: "Someone Else" }),
    ).rejects.toThrow("Pengundang / Unit wajib dipilih.");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test.each([
    ["ktpPhotoKey", "Foto KTP belum berhasil diupload."],
    ["selfiePhotoKey", "Foto Selfie belum berhasil diupload."],
    ["familyCardPhotoKey", "Kartu Keluarga belum berhasil diupload."],
    ["savingsPhotoKey", "Foto buku tabungan/rekening koran belum berhasil diupload."],
  ] as const)("rejects a missing required photo key: %s", async (field, message) => {
    await expect(submitJoinData({ ...validInput, [field]: "" })).rejects.toThrow(message);
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("rejects a photo key that isn't scoped to the caller's own folder", async () => {
    await expect(
      submitJoinData({ ...validInput, ktpPhotoKey: "someone_else/ktp.jpg" }),
    ).rejects.toThrow("Foto KTP belum berhasil diupload.");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("allows a null spousePhotoKey (only required if married)", async () => {
    await submitJoinData({ ...validInput, spousePhotoKey: null });

    expect(upsertMemberIntake).toHaveBeenCalled();
  });

  test("rejects a spousePhotoKey outside the caller's own folder when provided", async () => {
    await expect(
      submitJoinData({ ...validInput, spousePhotoKey: "someone_else/spouse.jpg" }),
    ).rejects.toThrow("Foto KTP Pasangan belum berhasil diupload.");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("re-checks membership — the action is reachable by direct POST", async () => {
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(submitJoinData(validInput)).rejects.toThrow("NEXT_REDIRECT");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("rejects a malformed active email before touching the database", async () => {
    await expect(
      submitJoinData({ ...validInput, activeEmail: "not-an-email" }),
    ).rejects.toThrow("Format email aktif belum bener.");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });

  test("pre-authorizes Email Aktif as an agent recruited by the chosen Pengundang / Unit leader", async () => {
    await submitJoinData(validInput);

    expect(resolvePengundangUnitLeaderId).toHaveBeenCalledWith("Robert / Lini");
    expect(createPendingInvite).toHaveBeenCalledWith({
      email: "rani@example.com",
      recruiterId: "leader_1",
      role: "agent",
      invitedBy: "leader_1",
    });
  });

  test("does not fail the save when Email Aktif already belongs to a real user", async () => {
    createPendingInvite.mockResolvedValue({ ok: false, reason: "existing-user" });

    const result = await submitJoinData(validInput);

    expect(upsertMemberIntake).toHaveBeenCalled();
    expect(result).toEqual(savedRecord);
  });

  test("skips creating an invite if the chosen leader can't be resolved", async () => {
    resolvePengundangUnitLeaderId.mockResolvedValue(null);

    await submitJoinData(validInput);

    expect(createPendingInvite).not.toHaveBeenCalled();
  });
});
