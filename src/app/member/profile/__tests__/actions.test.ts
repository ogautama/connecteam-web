import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  requireMember,
  upsertMemberIntake,
  getMemberIntake,
  getPengundangUnitOptions,
  getPengundangUnitForMember,
  resolvePengundangUnitLeaderId,
  setItemCompletion,
  revalidatePath,
  createPendingInvite,
} = vi.hoisted(() => ({
  requireMember: vi.fn(),
  upsertMemberIntake: vi.fn(),
  getMemberIntake: vi.fn(),
  getPengundangUnitOptions: vi.fn(),
  getPengundangUnitForMember: vi.fn(),
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
  getPengundangUnitForMember,
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
  schoolCity: "Jakarta",
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
  // Default: nothing derivable from the tree — the submitted value is
  // validated against the live list, as before Plan 20b's follow-up.
  getPengundangUnitForMember.mockResolvedValue(null);
  resolvePengundangUnitLeaderId.mockResolvedValue("leader_1");
  createPendingInvite.mockResolvedValue({ ok: true, invite: {} });
});

describe("submitJoinData", () => {
  test("saves the intake data and returns the persisted record", async () => {
    const result = await submitJoinData(validInput);

    expect(upsertMemberIntake).toHaveBeenCalledWith("user_1", validInput);
    expect(revalidatePath).toHaveBeenCalledWith("/member/profile");
    expect(result).toEqual(savedRecord);
  });

  test("writes no onboarding progress — the checklist item is gone (2026-08-05)", async () => {
    // "join-isi-data" left ONBOARDING_SECTIONS, so a row for it can never be
    // rendered again; writing one would re-create exactly the dead state the
    // accompanying migration deletes.
    await submitJoinData(validInput);

    expect(setItemCompletion).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalledWith("/member/onboarding");
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
    // activeEmail isn't here: it's taken from the session, not from input,
    // so an empty one in the payload is ignored rather than rejected.
    ["activePhone", "No HP aktif wajib diisi."],
    ["address", "Alamat domisili wajib diisi."],
    ["schoolName", "Nama sekolah/universitas wajib diisi."],
    ["schoolCity", "Kota sekolah/universitas wajib diisi."],
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

  test("re-derives Pengundang / Unit from the member's own tree, ignoring the submitted value", async () => {
    // Invited via Add Member: the unit is the walked-up *leader* of their
    // recruiter chain (the recruiter themself may be an agent). A direct
    // POST naming some other unit — even a real one from the list — loses
    // to the tree, the same way activeEmail loses to the session.
    getPengundangUnitForMember.mockResolvedValue("Haryo / Daisy");

    await submitJoinData({ ...validInput, pengundangUnit: "Robert / Lini" });

    expect(upsertMemberIntake).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ pengundangUnit: "Haryo / Daisy" }),
    );
    // The list validation doesn't even run — the tree already answered.
    expect(getPengundangUnitOptions).not.toHaveBeenCalled();
  });

  test("a derived unit accepts a submit that names no unit at all", async () => {
    getPengundangUnitForMember.mockResolvedValue("Haryo / Daisy");

    await submitJoinData({ ...validInput, pengundangUnit: "" });

    expect(upsertMemberIntake).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ pengundangUnit: "Haryo / Daisy" }),
    );
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

  test("takes activeEmail from the session, ignoring whatever was posted", async () => {
    // The form renders this field read-only, but the action takes direct
    // POSTs — so a hand-rolled payload must not be able to set it. Changing
    // it would hand createPendingInvite an arbitrary address, and
    // PendingInvite is the login allowlist.
    await submitJoinData({ ...validInput, activeEmail: "attacker@example.com" });

    expect(upsertMemberIntake).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ activeEmail: "rani@example.com" }),
    );
  });

  test("a posted activeEmail can't pre-authorize a new login", async () => {
    await submitJoinData({ ...validInput, activeEmail: "attacker@example.com" });

    expect(createPendingInvite).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: "attacker@example.com" }),
    );
  });

  test("a malformed posted email is ignored, not rejected", async () => {
    // Nothing to validate any more — the value never comes from input.
    await expect(
      submitJoinData({ ...validInput, activeEmail: "not-an-email" }),
    ).resolves.toBeDefined();

    expect(upsertMemberIntake).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ activeEmail: "rani@example.com" }),
    );
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
