import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { saveDiscLead } = vi.hoisted(() => ({ saveDiscLead: vi.fn() }));

// The real action pulls in Prisma via createLead — this suite is about the UI.
vi.mock("../actions", () => ({ saveDiscLead }));

import DiscTest from "../DiscTest";
import { DISC_QUESTIONS, type DiscTrait } from "@/lib/disc/questions";
import { DISC_PROFILES } from "@/content/disc-profiles";

/** Answers every question by picking its statement for `trait`. */
function completeTest(trait: DiscTrait) {
  for (const question of DISC_QUESTIONS) {
    const statement = question.statements.find((s) => s.trait === trait)!;
    fireEvent.click(screen.getByRole("button", { name: statement.text }));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  saveDiscLead.mockResolvedValue(undefined);
});

describe("DiscTest", () => {
  test("shows one question at a time with progress", () => {
    render(<DiscTest />);

    expect(
      screen.getByText(`Pertanyaan 1 dari ${DISC_QUESTIONS.length}`),
    ).toBeInTheDocument();
    expect(screen.getByText(DISC_QUESTIONS[0].prompt)).toBeInTheDocument();
    expect(screen.queryByText(DISC_QUESTIONS[1].prompt)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: DISC_QUESTIONS[0].statements[0].text }),
    );

    expect(
      screen.getByText(`Pertanyaan 2 dari ${DISC_QUESTIONS.length}`),
    ).toBeInTheDocument();
    expect(screen.getByText(DISC_QUESTIONS[1].prompt)).toBeInTheDocument();
  });

  test("completing every question reaches the results screen", () => {
    render(<DiscTest />);
    completeTest("S");

    expect(screen.getByText("Hasil tes kamu")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  test("results render the profile copy for the computed dominant trait", () => {
    render(<DiscTest />);
    completeTest("C");

    const profile = DISC_PROFILES.C;
    expect(
      screen.getByRole("heading", { name: profile.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(profile.summary)).toBeInTheDocument();
    expect(screen.getByText(profile.atWork)).toBeInTheDocument();
    // The all-C answer sheet must not surface some other profile's copy.
    expect(screen.queryByText(DISC_PROFILES.D.summary)).not.toBeInTheDocument();
  });

  test("a different answer pattern yields a different profile", () => {
    const { unmount } = render(<DiscTest />);
    completeTest("D");
    expect(
      screen.getByRole("heading", { name: DISC_PROFILES.D.title }),
    ).toBeInTheDocument();
    unmount();

    render(<DiscTest />);
    completeTest("I");
    expect(
      screen.getByRole("heading", { name: DISC_PROFILES.I.title }),
    ).toBeInTheDocument();
  });

  test("lead capture says what the number is for before it's submitted", () => {
    render(<DiscTest />);
    completeTest("D");

    // The disclosure has to be on the form itself — a visitor deciding whether
    // to hand over a phone number can't be told after the fact.
    expect(
      screen.getByText(/cuma dipakai buat mentor kami hubungi kamu/i),
    ).toBeInTheDocument();
  });

  test("lead capture requires a name and a contact before saving", () => {
    render(<DiscTest />);
    completeTest("D");

    fireEvent.click(screen.getByRole("button", { name: /Simpan hasil saya/i }));
    expect(saveDiscLead).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/nama dan nomor/i);

    fireEvent.change(screen.getByLabelText(/Nama/i), {
      target: { value: "  " },
    });
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/i), {
      target: { value: "081234567890" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Simpan hasil saya/i }));
    expect(saveDiscLead).not.toHaveBeenCalled();
  });

  test("lead capture saves the trimmed contact plus the answer sheet", async () => {
    render(<DiscTest />);
    completeTest("D");

    fireEvent.change(screen.getByLabelText(/Nama/i), {
      target: { value: "  Rizky  " },
    });
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/i), {
      target: { value: "081234567890" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Simpan hasil saya/i }));

    expect(saveDiscLead).toHaveBeenCalledWith({
      name: "Rizky",
      contact: "081234567890",
      answers: DISC_QUESTIONS.map(() => "D"),
    });
    expect(await screen.findByText("Hasilnya tersimpan")).toBeInTheDocument();
  });

  test("a failed save surfaces an error and keeps the form", async () => {
    saveDiscLead.mockRejectedValue(new Error("boom"));
    render(<DiscTest />);
    completeTest("D");

    fireEvent.change(screen.getByLabelText(/Nama/i), {
      target: { value: "Rizky" },
    });
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/i), {
      target: { value: "081234567890" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Simpan hasil saya/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/gagal menyimpan/i),
    );
    expect(
      screen.getByRole("button", { name: /Simpan hasil saya/i }),
    ).toBeInTheDocument();
  });

  test("restarting clears the answers and returns to question 1", () => {
    render(<DiscTest />);
    completeTest("D");

    fireEvent.click(screen.getByRole("button", { name: /Ulangi tes/i }));

    expect(
      screen.getByText(`Pertanyaan 1 dari ${DISC_QUESTIONS.length}`),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hasil tes kamu")).not.toBeInTheDocument();
  });
});
