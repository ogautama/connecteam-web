import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { checkExistingMember, submitApplication, upload, createSupabaseBrowserClient } =
  vi.hoisted(() => {
    const upload = vi.fn();
    return {
      checkExistingMember: vi.fn(),
      submitApplication: vi.fn(),
      upload,
      createSupabaseBrowserClient: vi.fn(() => ({
        storage: { from: () => ({ upload }) },
      })),
    };
  });

vi.mock("../actions", () => ({ checkExistingMember, submitApplication }));
vi.mock("@/lib/supabase", () => ({ createSupabaseBrowserClient }));

import { readJoinDraft, saveJoinDraft } from "@/lib/joinDraft";
import ApplicationForm from "../ApplicationForm";

const TEXT_ANSWERS: [RegExp, string][] = [
  [/Nama Lengkap/, "Rani Putri"],
  [/No KTP/, "1234567890123456"],
  [/Tempat Lahir/, "Jakarta"],
  [/Email Aktif/, "rani@example.com"],
  [/No HP aktif/, "081234567890"],
  [/Alamat Domisili/, "Jl. Sudirman No. 1"],
  [/Nama Sekolah/, "Universitas Indonesia"],
  [/Kota Sekolah/, "Jakarta"],
  [/Tahun Kelulusan/, "2020"],
];

function fillForm(container: HTMLElement, { email = "rani@example.com" } = {}) {
  for (const [label, value] of TEXT_ANSWERS) {
    fireEvent.change(screen.getByRole("textbox", { name: label }), {
      target: { value: label.source.startsWith("Email") ? email : value },
    });
  }
  // type="date" inputs aren't exposed with the textbox role.
  fireEvent.change(container.querySelector('input[type="date"]')!, {
    target: { value: "1998-05-10" },
  });
  fireEvent.click(screen.getByRole("radio", { name: "S1" }));
  fireEvent.click(screen.getByRole("radio", { name: "Robert / Lini" }));

  // Four required uploads, in render order: KTP, selfie, family card,
  // savings (the fifth, spouse, is optional).
  const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  for (const input of Array.from(fileInputs).slice(0, 4)) {
    fireEvent.change(input, {
      target: { files: [new File(["x"], "doc.jpg", { type: "image/jpeg" })] },
    });
  }
}

function renderForm() {
  return render(<ApplicationForm pengundangUnitOptions={["Robert / Lini"]} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  checkExistingMember.mockResolvedValue(false);
  upload.mockResolvedValue({ error: null });
  submitApplication.mockResolvedValue(undefined);
});

describe("ApplicationForm — existing-member check", () => {
  test("Email Aktif stays editable here, unlike the member Profile form", () => {
    // The Profile form locks this field to the signed-in Google account.
    // A public applicant has no account to pin it to, so the shared field
    // kit takes readOnly per-field rather than globally.
    renderForm();

    expect(screen.getByRole("textbox", { name: /Email Aktif/ })).not.toHaveAttribute(
      "readonly",
    );
  });

  test("uploads nothing and creates no Applicant when the email is already a member", async () => {
    checkExistingMember.mockResolvedValue(true);
    const { container } = renderForm();

    fillForm(container);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByText(/udah kedaftar sebagai member/)).toBeInTheDocument();
    expect(checkExistingMember).toHaveBeenCalledWith("rani@example.com");
    expect(upload).not.toHaveBeenCalled();
    expect(submitApplication).not.toHaveBeenCalled();
  });

  test("stashes the typed text answers as a draft and points at /member/isi-data", async () => {
    checkExistingMember.mockResolvedValue(true);
    const { container } = renderForm();

    fillForm(container);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));

    await screen.findByText(/udah kedaftar sebagai member/);
    expect(readJoinDraft()).toEqual({
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
      pengundangUnit: "Robert / Lini",
    });
    expect(
      screen.getByRole("link", { name: /Login & lanjut isi data/ }),
    ).toHaveAttribute("href", "/login?next=%2Fmember%2Fisi-data");
  });

  test("a non-member email submits exactly as before, leaving no draft behind", async () => {
    const { container } = renderForm();

    fillForm(container, { email: "baru@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByText("Aplikasi kamu udah kekirim!")).toBeInTheDocument();
    expect(checkExistingMember).toHaveBeenCalledWith("baru@example.com");
    expect(upload).toHaveBeenCalledTimes(4);
    await waitFor(() =>
      expect(submitApplication).toHaveBeenCalledWith(
        expect.objectContaining({ activeEmail: "baru@example.com", education: "s1" }),
      ),
    );
    expect(readJoinDraft()).toBeNull();
  });

  test("the check runs before validation passes, not on an incomplete form", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pendidikan Terakhir wajib dipilih.",
    );
    expect(checkExistingMember).not.toHaveBeenCalled();
  });

  test("a failing check surfaces as a normal inline error, not a lost submission", async () => {
    checkExistingMember.mockRejectedValue(new Error("jaringan lagi ngadat"));
    const { container } = renderForm();

    fillForm(container);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("jaringan lagi ngadat");
    expect(submitApplication).not.toHaveBeenCalled();
  });
});

describe("joinDraft storage", () => {
  const draft = {
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
    pengundangUnit: "Robert / Lini",
  };

  test("round-trips a saved draft", () => {
    saveJoinDraft(draft);
    expect(readJoinDraft()).toEqual(draft);
  });

  test("ignores corrupt or identity-less stored data rather than throwing", () => {
    window.sessionStorage.setItem("connecteam:join-draft:v1", "{not json");
    expect(readJoinDraft()).toBeNull();

    window.sessionStorage.setItem("connecteam:join-draft:v1", JSON.stringify({ fullName: "x" }));
    expect(readJoinDraft()).toBeNull();
  });
});
