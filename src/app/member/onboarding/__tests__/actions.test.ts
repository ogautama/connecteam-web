import { beforeEach, describe, expect, test, vi } from "vitest";

const { requireMember, upsertMemberIntake, setItemCompletion, revalidatePath } =
  vi.hoisted(() => ({
    requireMember: vi.fn(),
    upsertMemberIntake: vi.fn(),
    setItemCompletion: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/memberIntake", () => ({ upsertMemberIntake }));
vi.mock("@/lib/onboardingProgress", () => ({ setItemCompletion }));

import { submitJoinData } from "../actions";

const validInput = {
  ktpNumber: "1234567890123456",
  birthDate: "1998-05-10",
  phone: "081234567890",
  bankAccount: "9988776655",
  npwp: "12.345.678.9-012.000",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue({
    id: "user_1",
    name: "Rani Putri",
    email: "rani@example.com",
    role: "agent",
  });
});

describe("submitJoinData", () => {
  test("saves the intake data and marks the checklist item done", async () => {
    await submitJoinData(validInput);

    expect(upsertMemberIntake).toHaveBeenCalledWith("user_1", validInput);
    expect(setItemCompletion).toHaveBeenCalledWith("user_1", "join-isi-data", true);
    expect(revalidatePath).toHaveBeenCalledWith("/member/onboarding");
  });

  test("trims whitespace before saving", async () => {
    await submitJoinData({ ...validInput, phone: "  081234567890  " });

    expect(upsertMemberIntake).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ phone: "081234567890" }),
    );
  });

  test.each([
    ["ktpNumber", "Nomor KTP wajib diisi."],
    ["phone", "Nomor HP wajib diisi."],
    ["bankAccount", "Nomor rekening bank wajib diisi."],
    ["npwp", "NPWP wajib diisi."],
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

  test("re-checks membership — the action is reachable by direct POST", async () => {
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(submitJoinData(validInput)).rejects.toThrow("NEXT_REDIRECT");
    expect(upsertMemberIntake).not.toHaveBeenCalled();
  });
});
