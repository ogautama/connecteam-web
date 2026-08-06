import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

// Plan 20 layout: the sixteen questions live in five group cards, so labels
// follow the Profile edit-card wording ("Email aktif", "Sekolah /
// universitas"), education and Pengundang are selects, and the one submit
// button reads "Kirim aplikasi".
const TEXT_ANSWERS: [RegExp, string][] = [
  [/Nama Lengkap/, "Rani Putri"],
  [/No KTP/, "1234567890123456"],
  [/Tempat lahir/, "Jakarta"],
  [/Email aktif/, "rani@example.com"],
  [/No HP aktif/, "081234567890"],
  [/Alamat domisili/, "Jl. Sudirman No. 1"],
  [/Sekolah \/ universitas/, "Universitas Indonesia"],
  [/^Kota/, "Jakarta"],
  [/Tahun kelulusan/, "2020"],
];

function fillForm(
  container: HTMLElement,
  { email = "rani@example.com", education = "s1" } = {},
) {
  for (const [label, value] of TEXT_ANSWERS) {
    fireEvent.change(screen.getByRole("textbox", { name: label }), {
      target: { value: label.source.startsWith("Email") ? email : value },
    });
  }
  // type="date" inputs aren't exposed with the textbox role.
  fireEvent.change(container.querySelector('input[type="date"]')!, {
    target: { value: "1998-05-10" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Jenjang" }), {
    target: { value: education },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Pengundang / Unit" }), {
    target: { value: "Robert / Lini" },
  });

  // Four required uploads, in tile order: KTP, selfie, family card,
  // savings (the fifth, spouse, is optional).
  const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  for (const input of Array.from(fileInputs).slice(0, 4)) {
    fireEvent.change(input, {
      target: { files: [new File(["x"], "doc.jpg", { type: "image/jpeg" })] },
    });
  }
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /Kirim aplikasi|Mengecek|Mengupload|Mengirim/ }));
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
  test("Email aktif stays editable here, unlike the member Profile form", () => {
    // The Profile form locks this field to the signed-in Google account.
    // A public applicant has no account to pin it to.
    renderForm();

    expect(screen.getByRole("textbox", { name: /Email aktif/ })).not.toHaveAttribute(
      "readonly",
    );
  });

  test("uploads nothing and creates no Applicant when the email is already a member", async () => {
    checkExistingMember.mockResolvedValue(true);
    const { container } = renderForm();

    fillForm(container);
    submit();

    expect(await screen.findByText(/udah kedaftar sebagai member/)).toBeInTheDocument();
    expect(checkExistingMember).toHaveBeenCalledWith("rani@example.com");
    expect(upload).not.toHaveBeenCalled();
    expect(submitApplication).not.toHaveBeenCalled();
  });

  test("stashes the typed text answers as a draft and points at /member/profile", async () => {
    checkExistingMember.mockResolvedValue(true);
    const { container } = renderForm();

    fillForm(container);
    submit();

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
    ).toHaveAttribute("href", "/login?next=%2Fmember%2Fprofile");
  });

  test("a non-member email submits exactly as before, leaving no draft behind", async () => {
    const { container } = renderForm();

    fillForm(container, { email: "baru@example.com" });
    submit();

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

  test("the check runs after validation passes, not on an incomplete form", async () => {
    renderForm();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/hal masih kurang/);
    expect(checkExistingMember).not.toHaveBeenCalled();
  });

  test("a failing check surfaces as a normal inline error, not a lost submission", async () => {
    checkExistingMember.mockRejectedValue(new Error("jaringan lagi ngadat"));
    const { container } = renderForm();

    fillForm(container);
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("jaringan lagi ngadat");
    expect(submitApplication).not.toHaveBeenCalled();
  });
});

describe("all-at-once validation (Plan 20)", () => {
  test("an empty submit flags every section at once, not just the first error", async () => {
    renderForm();

    submit();

    // The summary counts every gap (3 kontak + 4 identitas + 4 pendidikan +
    // 4 dokumen + 1 pengundang) and links each offending section.
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("16 hal masih kurang.");
    for (const title of [
      "Nama & kontak",
      "Identitas",
      "Pendidikan terakhir",
      "Dokumen",
      "Pengundang / Unit",
    ]) {
      expect(within(summary).getByRole("button", { name: title })).toBeInTheDocument();
    }

    // Inline messages render at their own fields, all simultaneously —
    // one from each card.
    expect(screen.getByText("Nama lengkap wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Nomor KTP wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Pendidikan Terakhir wajib dipilih.")).toBeInTheDocument();
    expect(screen.getByText("Pengundang / Unit wajib dipilih.")).toBeInTheDocument();

    // And the owning cards carry their counts.
    expect(screen.getByText("3 belum diisi")).toBeInTheDocument(); // kontak
    expect(screen.getByText("1 belum diisi")).toBeInTheDocument(); // pengundang
  });

  test("editing a flagged field clears its message immediately", async () => {
    renderForm();

    submit();
    await screen.findByText("Nama lengkap wajib diisi.");

    fireEvent.change(screen.getByRole("textbox", { name: /Nama Lengkap/ }), {
      target: { value: "Rani" },
    });

    expect(screen.queryByText("Nama lengkap wajib diisi.")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("15 hal masih kurang.");
  });
});

describe("document tiles (Plan 20)", () => {
  test("picking a file shows its name and ticks the counter; Hapus un-picks", () => {
    const { container } = renderForm();
    const ktpInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(ktpInput, {
      target: { files: [new File(["x"], "ktp-depan.jpg", { type: "image/jpeg" })] },
    });

    expect(screen.getByText("ktp-depan.jpg")).toBeInTheDocument();
    expect(screen.getByText("1 dari 4 wajib")).toBeInTheDocument();
    // Nothing uploads at pick time — files ride the one submit.
    expect(upload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    expect(screen.queryByText("ktp-depan.jpg")).not.toBeInTheDocument();
    expect(screen.getByText("0 dari 4 wajib")).toBeInTheDocument();
  });

  test("an oversize file is rejected at pick time, not held until submit", () => {
    const { container } = renderForm();
    const ktpInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    const big = new File(["x"], "raw-scan.tiff", { type: "image/tiff" });
    Object.defineProperty(big, "size", { value: 100 * 1024 * 1024 + 1 });
    fireEvent.change(ktpInput, { target: { files: [big] } });

    expect(screen.getByText(/Ukuran file maksimal 100MB/)).toBeInTheDocument();
    expect(screen.queryByText("raw-scan.tiff")).not.toBeInTheDocument();
    expect(screen.getByText("0 dari 4 wajib")).toBeInTheDocument();
  });
});

describe("education picklist (Plan 20)", () => {
  test("offers Diploma (D1–D4) between SMA / SLTA / SMK and S1", () => {
    renderForm();

    const options = within(screen.getByRole("combobox", { name: "Jenjang" }))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual([
      "Pilih…",
      "SMA / SLTA / SMK",
      "Diploma (D1–D4)",
      "S1",
      "S2",
      "S3",
    ]);
  });

  test("a diploma application submits end-to-end", async () => {
    const { container } = renderForm();

    fillForm(container, { education: "diploma" });
    submit();

    expect(await screen.findByText("Aplikasi kamu udah kekirim!")).toBeInTheDocument();
    await waitFor(() =>
      expect(submitApplication).toHaveBeenCalledWith(
        expect.objectContaining({ education: "diploma" }),
      ),
    );
  });
});

describe("upload progress (Plan 20)", () => {
  test("the button counts files while they upload", async () => {
    // Four controllable uploads — hold them open to catch the label
    // mid-flight, then release.
    const resolvers: ((v: { error: null }) => void)[] = [];
    upload.mockImplementation(
      () => new Promise<{ error: null }>((res) => resolvers.push(res)),
    );
    const { container } = renderForm();

    fillForm(container);
    submit();

    expect(await screen.findByRole("button", { name: "Mengupload 1 dari 4…" })).toBeDisabled();
    expect(screen.getByText(/Jangan tutup halaman ini/)).toBeInTheDocument();

    await waitFor(() => expect(resolvers).toHaveLength(4));
    for (const res of resolvers) res({ error: null });

    expect(await screen.findByText("Aplikasi kamu udah kekirim!")).toBeInTheDocument();
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
