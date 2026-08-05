import { beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { requireMember, getMemberIntake, getPengundangUnitOptions, getAcceptedApplicantByEmail } =
  vi.hoisted(() => ({
    requireMember: vi.fn(),
    getMemberIntake: vi.fn(),
    getPengundangUnitOptions: vi.fn(),
    getAcceptedApplicantByEmail: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/memberIntake", async () => {
  const actual = await vi.importActual<typeof import("@/lib/memberIntake")>(
    "@/lib/memberIntake",
  );
  return { ...actual, getMemberIntake, getPengundangUnitOptions };
});
vi.mock("@/lib/applicant", () => ({ getAcceptedApplicantByEmail }));

import { saveJoinDraft, type JoinDraft } from "@/lib/joinDraft";
import IsiDataPage from "../page";

const savedIntake = {
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
  pengundangUnit: "Budi Santoso",
  ktpPhotoUrl: null,
  selfiePhotoUrl: null,
  familyCardPhotoUrl: null,
  savingsPhotoUrl: null,
  spousePhotoUrl: null,
};

const draft: JoinDraft = {
  fullName: "Rani Dari Join",
  ktpNumber: "9999999999999999",
  birthPlace: "Bandung",
  birthDate: "1999-01-02",
  activeEmail: "Rani@Example.com ",
  activePhone: "089999999999",
  address: "Jl. Asia Afrika No. 9",
  education: "s1",
  schoolName: "Institut Teknologi Bandung",
  schoolCity: "Bandung",
  graduationYear: "2021",
  pengundangUnit: "Robert / Lini",
};

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  requireMember.mockResolvedValue({
    id: "user_1",
    name: "Rani Putri",
    email: "rani@example.com",
    role: "agent",
  });
  getMemberIntake.mockResolvedValue(null);
  getPengundangUnitOptions.mockResolvedValue(["Robert / Lini", "Haryo / Daisy"]);
  getAcceptedApplicantByEmail.mockResolvedValue(null);
});

describe("isi-data page", () => {
  test("gates on membership before rendering", async () => {
    render(await IsiDataPage());

    expect(requireMember).toHaveBeenCalled();
    expect(getMemberIntake).toHaveBeenCalledWith("user_1");
  });

  test("never renders for a signed-out visitor — the guard redirects first", async () => {
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(IsiDataPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(getMemberIntake).not.toHaveBeenCalled();
  });

  test("shows the form with all required fields when nothing is saved yet", async () => {
    render(await IsiDataPage());

    expect(screen.getByRole("heading", { level: 1, name: "Isi Data" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /No KTP/ })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pendidikan Terakhir" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pengundang / Unit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Robert / Lini" })).toBeInTheDocument();
  });

  test("defaults the Email Aktif field to the signed-in member's email", async () => {
    render(await IsiDataPage());

    expect(screen.getByRole("textbox", { name: /Email Aktif/ })).toHaveValue(
      "rani@example.com",
    );
  });

  test("renders Pengundang / Unit options from the live leader list, not a fixed picklist", async () => {
    getPengundangUnitOptions.mockResolvedValue(["Zaki Firmansyah"]);

    render(await IsiDataPage());

    expect(getPengundangUnitOptions).toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Zaki Firmansyah" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Robert / Lini" })).not.toBeInTheDocument();
  });

  test("shows a matched accepted application read-only instead of a blank form", async () => {
    getAcceptedApplicantByEmail.mockResolvedValue({
      fullName: "Rani Putri",
      ktpNumber: "1234567890123456",
      birthPlace: "Jakarta",
      birthDate: "1998-05-10",
      activeEmail: "rani@example.com",
      activePhone: "081234567890",
      address: "Jl. Sudirman No. 1",
      education: "s1",
      schoolName: "Universitas Indonesia",
      schoolCity: "Jakarta",
      graduationYear: "2020",
      pengundangUnit: "Budi Santoso",
      ktpPhotoUrl: "https://signed.example/ktp",
      selfiePhotoUrl: null,
      familyCardPhotoUrl: null,
      savingsPhotoUrl: null,
      spousePhotoUrl: null,
    });

    render(await IsiDataPage());

    expect(getAcceptedApplicantByEmail).toHaveBeenCalledWith("rani@example.com");
    expect(screen.getByText("1234567890123456")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ubah data" })).not.toBeInTheDocument();
  });

  test("skips the applicant lookup entirely once MemberIntake already exists", async () => {
    getMemberIntake.mockResolvedValue(savedIntake);

    render(await IsiDataPage());

    expect(getAcceptedApplicantByEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ubah data" })).toBeInTheDocument();
  });
});

// Plan 07c: someone who filled out the public /join form under an email
// that already belongs to a member is sent here to log in, with their typed
// answers handed over through sessionStorage.
describe("isi-data page — /join draft handoff", () => {
  test("prefills the form from a draft under this member's own email", async () => {
    saveJoinDraft(draft);

    render(await IsiDataPage());

    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toHaveValue(
      "Rani Dari Join",
    );
    expect(screen.getByRole("textbox", { name: /No KTP/ })).toHaveValue(
      "9999999999999999",
    );
    expect(screen.getByRole("radio", { name: "Robert / Lini" })).toBeChecked();
    // The signed-in identity wins over whatever was typed on the public form.
    expect(screen.getByRole("textbox", { name: /Email Aktif/ })).toHaveValue(
      "rani@example.com",
    );
    expect(screen.getByText(/upload ulang dokumennya/)).toBeInTheDocument();
  });

  test("consumes the draft on first read so a later visit is blank again", async () => {
    saveJoinDraft(draft);

    render(await IsiDataPage());
    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toHaveValue(
      "Rani Dari Join",
    );

    cleanup();
    render(await IsiDataPage());
    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toHaveValue("");
  });

  test("ignores a draft left behind under somebody else's email", async () => {
    saveJoinDraft({ ...draft, activeEmail: "orang.lain@example.com" });

    render(await IsiDataPage());

    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toHaveValue("");
    expect(screen.queryByText(/upload ulang dokumennya/)).not.toBeInTheDocument();
  });

  test("an existing MemberIntake always wins over a draft", async () => {
    getMemberIntake.mockResolvedValue(savedIntake);
    saveJoinDraft(draft);

    render(await IsiDataPage());

    expect(screen.getByRole("button", { name: "Ubah data" })).toBeInTheDocument();
    expect(screen.queryByText("Rani Dari Join")).not.toBeInTheDocument();
  });

  test("takes priority over the read-only accepted-application view", async () => {
    getAcceptedApplicantByEmail.mockResolvedValue({
      ...savedIntake,
      ktpPhotoUrl: "https://signed.example/ktp",
    });
    saveJoinDraft(draft);

    render(await IsiDataPage());

    // The editable form, not the read-only summary — the files still have
    // to be re-picked, so a summary couldn't finish the job.
    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toHaveValue(
      "Rani Dari Join",
    );
  });
});
