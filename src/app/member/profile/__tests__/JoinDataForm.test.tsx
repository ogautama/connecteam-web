import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { submitJoinData, upload, createSupabaseBrowserClient } = vi.hoisted(() => {
  const upload = vi.fn();
  return {
    submitJoinData: vi.fn(),
    upload,
    createSupabaseBrowserClient: vi.fn(() => ({
      storage: { from: () => ({ upload }) },
    })),
  };
});

vi.mock("../actions", () => ({ submitJoinData }));
vi.mock("@/lib/supabase", () => ({ createSupabaseBrowserClient }));

import type { MemberIntakeRecord } from "@/lib/memberIntake";
import JoinDataForm from "../JoinDataForm";

// Plan 19 — per-section editing. The client already holds the whole saved
// record, so a section save should send it back with only that section's
// fields swapped in; everything else must survive untouched.
const saved: MemberIntakeRecord = {
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
  ktpPhotoKey: "user_1/ktp.jpg",
  selfiePhotoKey: "user_1/selfie.jpg",
  familyCardPhotoKey: "user_1/familyCard.jpg",
  savingsPhotoKey: "user_1/savings.jpg",
  spousePhotoKey: null,
  ktpPhotoUrl: "https://signed.example/ktp",
  selfiePhotoUrl: "https://signed.example/selfie",
  familyCardPhotoUrl: "https://signed.example/family",
  savingsPhotoUrl: "https://signed.example/savings",
  spousePhotoUrl: null,
};

function renderForm(initial: MemberIntakeRecord | null = saved) {
  return render(
    <JoinDataForm
      userId="user_1"
      defaultEmail="rani@example.com"
      initial={initial}
      pengundangUnitOptions={["Budi Santoso"]}
      linkedApplication={null}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  upload.mockResolvedValue({ error: null });
});

describe("JoinDataForm — No KTP masking", () => {
  test("hides all but the last four digits until 'Lihat' is pressed", () => {
    renderForm();

    expect(screen.getByText("•••• •••• •••• 3456")).toBeInTheDocument();
    expect(screen.queryByText("1234 5678 9012 3456")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lihat" }));

    expect(screen.getByText("1234 5678 9012 3456")).toBeInTheDocument();
    expect(screen.queryByText("•••• •••• •••• 3456")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan" }));

    expect(screen.getByText("•••• •••• •••• 3456")).toBeInTheDocument();
  });
});

describe("JoinDataForm — per-section editing", () => {
  test("editing Identitas only sends that section's fields as changed", async () => {
    submitJoinData.mockResolvedValue({ ...saved, birthPlace: "Bandung" });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Ubah Identitas" }));
    fireEvent.change(screen.getByLabelText("Tempat lahir"), {
      target: { value: "Bandung" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(submitJoinData).toHaveBeenCalled());
    expect(submitJoinData).toHaveBeenCalledWith(
      expect.objectContaining({
        // Changed:
        birthPlace: "Bandung",
        // Untouched — every other field goes back exactly as saved:
        fullName: saved.fullName,
        ktpNumber: saved.ktpNumber,
        birthDate: saved.birthDate,
        address: saved.address,
        activePhone: saved.activePhone,
        education: saved.education,
        schoolName: saved.schoolName,
        schoolCity: saved.schoolCity,
        graduationYear: saved.graduationYear,
        pengundangUnit: saved.pengundangUnit,
        ktpPhotoKey: saved.ktpPhotoKey,
        selfiePhotoKey: saved.selfiePhotoKey,
        familyCardPhotoKey: saved.familyCardPhotoKey,
        savingsPhotoKey: saved.savingsPhotoKey,
      }),
    );
    // Back to the resting view, showing the new value.
    expect(await screen.findByText(/Bandung/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Tempat lahir")).not.toBeInTheDocument();
  });

  test("editing Nama & kontak leaves Email Aktif untouched (locked, re-derived server-side)", async () => {
    submitJoinData.mockResolvedValue({ ...saved, activePhone: "089999999999" });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Ubah Nama & kontak" }));
    fireEvent.change(screen.getByLabelText("No HP aktif (Whatsapp)"), {
      target: { value: "089999999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(submitJoinData).toHaveBeenCalled());
    expect(submitJoinData).toHaveBeenCalledWith(
      expect.objectContaining({
        activePhone: "089999999999",
        activeEmail: saved.activeEmail,
        fullName: saved.fullName,
      }),
    );
  });

  test("rejects an empty required field before calling submitJoinData", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Ubah Identitas" }));
    fireEvent.change(screen.getByLabelText("Tempat lahir"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Tempat lahir wajib diisi.");
    expect(submitJoinData).not.toHaveBeenCalled();
  });

  test("Batal discards the edit and leaves the saved record untouched", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Ubah Identitas" }));
    fireEvent.change(screen.getByLabelText("Tempat lahir"), { target: { value: "Bandung" } });
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(submitJoinData).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Tempat lahir")).not.toBeInTheDocument();
    expect(screen.getByText("Jakarta, 10 Mei 1998")).toBeInTheDocument();
  });
});

// Plan 20b — the first fill (no MemberIntake row yet) wears /join's five
// group cards with a single "Simpan": all-at-once validation, pending-file
// tiles, selects for Jenjang and Pengundang / Unit.
describe("JoinDataForm — first fill", () => {
  function fillFirstFill(container: HTMLElement) {
    const answers: [RegExp, string][] = [
      [/Nama Lengkap/, "Rani Putri"],
      [/No KTP/, "1234567890123456"],
      [/Tempat lahir/, "Jakarta"],
      [/No HP aktif/, "081234567890"],
      [/Alamat domisili/, "Jl. Sudirman No. 1"],
      [/Sekolah \/ universitas/, "Universitas Indonesia"],
      [/^Kota/, "Jakarta"],
      [/Tahun kelulusan/, "2020"],
    ];
    for (const [label, value] of answers) {
      fireEvent.change(screen.getByRole("textbox", { name: label }), {
        target: { value },
      });
    }
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: "1998-05-10" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Jenjang" }), {
      target: { value: "s1" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Pengundang / Unit" }), {
      target: { value: "Budi Santoso" },
    });
    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    for (const input of Array.from(fileInputs).slice(0, 4)) {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "doc.jpg", { type: "image/jpeg" })] },
      });
    }
  }

  test("an empty submit flags every section at once — except the locked email", async () => {
    renderForm(null);

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    // 2 kontak (email is locked, so it can't be "kurang") + 4 identitas +
    // 4 pendidikan + 4 dokumen + 1 pengundang.
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("15 hal masih kurang.");
    expect(screen.getByText("Nama lengkap wajib diisi.")).toBeInTheDocument();
    expect(screen.getByText("Pendidikan Terakhir wajib dipilih.")).toBeInTheDocument();
    expect(screen.getByText("2 belum diisi")).toBeInTheDocument(); // kontak
    expect(submitJoinData).not.toHaveBeenCalled();
  });

  test("email renders locked to the signed-in account, not as a question", () => {
    renderForm(null);

    const email = screen.getByRole("textbox", { name: /Email aktif/ });
    expect(email).toHaveValue("rani@example.com");
    expect(email).toHaveAttribute("readonly");
  });

  test("a complete fill uploads to the member's own paths and saves once", async () => {
    submitJoinData.mockResolvedValue(saved);
    const { container } = renderForm(null);

    fillFirstFill(container);
    expect(screen.getByText("4 dari 4 wajib")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    // Uploads are keyed by userId (member-intake bucket), not a random
    // submission id — re-submitting overwrites the member's own files.
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(4));
    expect(upload.mock.calls.map((c) => c[0]).sort()).toEqual([
      "user_1/familyCard.jpg",
      "user_1/ktp.jpg",
      "user_1/savings.jpg",
      "user_1/selfie.jpg",
    ]);
    await waitFor(() => expect(submitJoinData).toHaveBeenCalledTimes(1));
    expect(submitJoinData).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Rani Putri",
        education: "s1",
        pengundangUnit: "Budi Santoso",
        ktpPhotoKey: "user_1/ktp.jpg",
        spousePhotoKey: null,
      }),
    );
    // Lands on the saved per-section view, same as a returning member.
    expect(await screen.findByRole("button", { name: "Ubah Identitas" })).toBeInTheDocument();
  });

  test("Jenjang offers Diploma (D1–D4) between SMA and S1 here too", () => {
    renderForm(null);

    const options = Array.from(
      (screen.getByRole("combobox", { name: "Jenjang" }) as HTMLSelectElement).options,
    ).map((o) => o.text);
    expect(options).toEqual([
      "Pilih…",
      "SMA / SLTA / SMK",
      "Diploma (D1–D4)",
      "S1",
      "S2",
      "S3",
    ]);
  });
});

describe("JoinDataForm — document tiles", () => {
  test("'Ganti' uploads and saves just that document's key, unchanged elsewhere", async () => {
    submitJoinData.mockResolvedValue(saved);
    const { container } = renderForm();

    const ktpTile = screen.getByText("Foto KTP").closest("div")!.parentElement!;
    const fileInput = ktpTile.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["x"], "ktp-baru.jpg", { type: "image/jpeg" })] },
    });

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0][0]).toBe("user_1/ktp.jpg");

    await waitFor(() => expect(submitJoinData).toHaveBeenCalled());
    expect(submitJoinData).toHaveBeenCalledWith(
      expect.objectContaining({
        ktpPhotoKey: "user_1/ktp.jpg",
        selfiePhotoKey: saved.selfiePhotoKey,
        familyCardPhotoKey: saved.familyCardPhotoKey,
        savingsPhotoKey: saved.savingsPhotoKey,
        fullName: saved.fullName,
      }),
    );
    expect(container).toBeTruthy();
  });
});
