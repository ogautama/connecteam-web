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
