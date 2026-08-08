import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { saveDiscLead, useSearchParams } = vi.hoisted(() => ({
  saveDiscLead: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// The real action pulls in Prisma via createLead — this suite is about the UI.
vi.mock("../actions", () => ({ saveDiscLead }));
vi.mock("next/navigation", () => ({ useSearchParams }));

import DiscTest from "../DiscTest";
import { DISC_QUESTIONS, type DiscTrait } from "@/lib/disc/questions";
import { DISC_PROFILES } from "@/content/disc-profiles";
import { scoreDisc } from "@/lib/disc/score";

const STORAGE_KEY = "disc-test-v1";

/** Leaves the intro screen for question 1. */
function startTest() {
  fireEvent.click(screen.getByRole("button", { name: "Mulai tes" }));
}

/** Picks the statement for `trait` on the question currently on screen. */
function pick(index: number, trait: DiscTrait) {
  const statement = DISC_QUESTIONS[index].statements.find(
    (s) => s.trait === trait,
  )!;
  fireEvent.click(screen.getByRole("radio", { name: statement.text }));
}

/**
 * A fresh answer holds its selected state for ~150ms before advancing, so the
 * clock has to be driven to walk the test. Fake timers are switched on only
 * for the walk — everything after it (saves, findBy*) runs on real ones.
 */
function answerFrom(trait: DiscTrait, from: number, to: number) {
  vi.useFakeTimers();
  try {
    for (let index = from; index < to; index += 1) {
      pick(index, trait);
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }
  } finally {
    vi.useRealTimers();
  }
}

/** Intro → the whole test → the result screen. */
function completeTest(trait: DiscTrait) {
  startTest();
  answerFrom(trait, 0, DISC_QUESTIONS.length);
}

function fillLeadForm(name = "Rizky", contact = "081234567890") {
  fireEvent.change(screen.getByLabelText(/Nama/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/i), {
    target: { value: contact },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  saveDiscLead.mockResolvedValue(undefined);
  useSearchParams.mockReturnValue(new URLSearchParams());
});

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */

describe("intro screen", () => {
  test("names the referrer before anything is asked of the visitor", () => {
    render(<DiscTest referrerName="Olivia" />);

    expect(screen.getByText("Olivia")).toBeInTheDocument();
    expect(screen.getByText(/ngajak kamu ikut tes ini/)).toBeInTheDocument();
    // The questions belong to the next screen.
    expect(screen.queryByText(DISC_QUESTIONS[0].prompt)).not.toBeInTheDocument();
  });

  test("falls back to the brand when there is no referrer to name", () => {
    render(<DiscTest referrerName={null} />);

    expect(screen.getByText("CONNECTeam")).toBeInTheDocument();
    expect(screen.getByText(/tes gaya kerja/)).toBeInTheDocument();
    expect(screen.queryByText(/ngajak kamu ikut tes ini/)).not.toBeInTheDocument();
  });

  test("\"Mulai tes\" enters the test at question 1", () => {
    render(<DiscTest />);
    startTest();

    expect(
      screen.getByText(`Pertanyaan 1 dari ${DISC_QUESTIONS.length}`),
    ).toBeInTheDocument();
    expect(screen.getByText(DISC_QUESTIONS[0].prompt)).toBeInTheDocument();
    expect(screen.queryByText(DISC_QUESTIONS[1].prompt)).not.toBeInTheDocument();
  });
});

describe("answering", () => {
  test("a fresh answer advances on its own", () => {
    render(<DiscTest />);
    startTest();
    answerFrom("D", 0, 1);

    expect(
      screen.getByText(`Pertanyaan 2 dari ${DISC_QUESTIONS.length}`),
    ).toBeInTheDocument();
    expect(screen.getByText(DISC_QUESTIONS[1].prompt)).toBeInTheDocument();
  });

  test("progress counts answered questions, not the current step", () => {
    render(<DiscTest />);
    startTest();

    // Question 1 on screen, nothing answered yet — the old bar read 0% here
    // and never reached the end.
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );

    answerFrom("D", 0, 3);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", String(DISC_QUESTIONS.length));
  });

  test("1–4 on the keyboard picks the matching option", () => {
    render(<DiscTest />);
    startTest();

    vi.useFakeTimers();
    fireEvent.keyDown(window, { key: "2" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    vi.useRealTimers();

    // The second statement of question 1 is now the answer, so the test has
    // moved on to question 2 (after its acknowledgment).
    const statement = DISC_QUESTIONS[0].statements[1];
    expect(screen.getByText(DISC_QUESTIONS[1].prompt)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    expect(screen.getByRole("radio", { name: statement.text })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("going back keeps the answer and offers a way forward", () => {
    render(<DiscTest />);
    startTest();
    answerFrom("D", 0, 2);

    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    expect(screen.getByText(DISC_QUESTIONS[1].prompt)).toBeInTheDocument();

    // The pick is still there, and "Lanjut →" gets you back without
    // re-answering — the old screen made you pick again to move forward.
    const statement = DISC_QUESTIONS[1].statements.find((s) => s.trait === "D")!;
    expect(screen.getByRole("radio", { name: statement.text })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /Lanjut/ }));
    expect(screen.getByText(DISC_QUESTIONS[2].prompt)).toBeInTheDocument();
  });

  test("changing an existing answer stays put instead of teleporting forward", () => {
    render(<DiscTest />);
    startTest();
    answerFrom("D", 0, 3);

    fireEvent.click(screen.getByRole("button", { name: /Sebelumnya/ }));
    pick(2, "S");

    // Still on question 3 — auto-advance is for fresh answers only.
    expect(screen.getByText(DISC_QUESTIONS[2].prompt)).toBeInTheDocument();
    const statement = DISC_QUESTIONS[2].statements.find((s) => s.trait === "S")!;
    expect(screen.getByRole("radio", { name: statement.text })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("\"Sebelumnya\" is inert on the first question", () => {
    render(<DiscTest />);
    startTest();

    expect(screen.getByRole("button", { name: /Sebelumnya/ })).toBeDisabled();
  });
});

describe("persistence", () => {
  test("a stored partial session offers to resume instead of the intro", () => {
    const answers = DISC_QUESTIONS.map((_, i) => (i < 11 ? "D" : null));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step: 11, answers }),
    );

    render(<DiscTest referrerName="Olivia" />);

    expect(screen.getByText("Lanjutin dari pertanyaan 12?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mulai tes" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lanjutin" }));
    expect(screen.getByText(DISC_QUESTIONS[11].prompt)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "11",
    );
  });

  test("\"Mulai dari awal\" drops the stored answers and returns to the intro", () => {
    const answers = DISC_QUESTIONS.map((_, i) => (i < 5 ? "D" : null));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step: 5, answers }),
    );

    render(<DiscTest />);
    fireEvent.click(screen.getByRole("button", { name: "Mulai dari awal" }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Mulai tes" })).toBeInTheDocument();
  });

  test("answers are written as they're given and cleared at the result", () => {
    render(<DiscTest />);
    startTest();
    answerFrom("D", 0, 2);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.step).toBe(2);
    expect(stored.answers.slice(0, 2)).toEqual(["D", "D"]);

    answerFrom("D", 2, DISC_QUESTIONS.length);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test("a stored sheet from a different-length bank is discarded, not misapplied", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step: 3, answers: ["D", "I", "S"] }),
    );

    render(<DiscTest />);

    expect(screen.getByRole("button", { name: "Mulai tes" })).toBeInTheDocument();
    expect(screen.queryByText(/Lanjutin dari pertanyaan/)).not.toBeInTheDocument();
  });

  test("unreadable storage degrades to a normal fresh start", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    render(<DiscTest />);

    expect(screen.getByRole("button", { name: "Mulai tes" })).toBeInTheDocument();
  });
});

describe("the result", () => {
  test("renders the profile copy for the computed dominant trait", () => {
    render(<DiscTest />);
    completeTest("C");

    const profile = DISC_PROFILES.C;
    expect(screen.getByRole("heading", { name: profile.title })).toBeInTheDocument();
    expect(screen.getByText(profile.summary)).toBeInTheDocument();
    expect(screen.getByText(profile.atWork)).toBeInTheDocument();
    expect(screen.getByText(profile.watchOut)).toBeInTheDocument();
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

  test("marks the dominant traits and ranks them first", () => {
    render(<DiscTest />);
    completeTest("S");

    const result = scoreDisc(DISC_QUESTIONS.map(() => "S" as DiscTrait));
    expect(screen.getAllByText("dominan")).toHaveLength(result.dominant.length);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  test("restarting clears the answers and returns to question 1", () => {
    render(<DiscTest />);
    completeTest("D");

    fireEvent.click(screen.getByRole("button", { name: /Ulangi tes/i }));

    expect(
      screen.getByText(`Pertanyaan 1 dari ${DISC_QUESTIONS.length}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: DISC_PROFILES.D.title }),
    ).not.toBeInTheDocument();
  });
});

describe("the ask", () => {
  test("is addressed from the referrer, by name", () => {
    render(<DiscTest referrerName="Olivia" />);
    completeTest("D");

    expect(
      screen.getByRole("heading", { name: "Mau Olivia bahas hasilnya bareng kamu?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Kirim hasil ke Olivia" }),
    ).toBeInTheDocument();
    // The disclosure has to be on the form itself — a visitor deciding
    // whether to hand over a phone number can't be told after the fact, and
    // now it can name who actually receives it.
    expect(
      screen.getByText(/Nomor kamu cuma dipakai Olivia buat ngehubungi kamu lewat WhatsApp/i),
    ).toBeInTheDocument();
  });

  test("falls back to the brand wording without a referrer", () => {
    render(<DiscTest referrerName={null} />);
    completeTest("D");

    expect(
      screen.getByRole("heading", { name: "Mau tim kami bahas hasilnya bareng kamu?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Kirim hasil ke tim kami" }),
    ).toBeInTheDocument();
  });

  test("requires a name and a contact before saving", () => {
    render(<DiscTest />);
    completeTest("D");

    fireEvent.click(screen.getByRole("button", { name: /Kirim hasil ke/ }));
    expect(saveDiscLead).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/nama dan nomor/i);

    fillLeadForm("  ", "081234567890");
    fireEvent.click(screen.getByRole("button", { name: /Kirim hasil ke/ }));
    expect(saveDiscLead).not.toHaveBeenCalled();
  });

  test("saves the trimmed contact plus the answer sheet, then offers /join", async () => {
    render(<DiscTest referrerName="Olivia" />);
    completeTest("D");

    fillLeadForm("  Rizky  ");
    fireEvent.click(screen.getByRole("button", { name: /Kirim hasil ke/ }));

    expect(saveDiscLead).toHaveBeenCalledWith({
      name: "Rizky",
      contact: "081234567890",
      answers: DISC_QUESTIONS.map(() => "D"),
      ref: undefined,
    });

    expect(await screen.findByText(/Kekirim ke Olivia/)).toBeInTheDocument();
    // "Gabung Sekarang" only shows up here — after the visitor has already
    // said yes to a conversation, instead of competing with the ask.
    expect(
      screen.getByRole("link", { name: "Lihat cara gabung" }),
    ).toHaveAttribute("href", "/join");
  });

  test("a referral code in the URL rides along with the save", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("ref=cku7abc"));
    render(<DiscTest referrerName="Olivia" />);
    completeTest("D");

    fillLeadForm();
    fireEvent.click(screen.getByRole("button", { name: /Kirim hasil ke/ }));

    expect(saveDiscLead).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "cku7abc" }),
    );
  });

  test("a failed save surfaces an error and keeps the form", async () => {
    saveDiscLead.mockRejectedValue(new Error("boom"));
    render(<DiscTest />);
    completeTest("D");

    fillLeadForm();
    fireEvent.click(screen.getByRole("button", { name: /Kirim hasil ke/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/gagal menyimpan/i),
    );
    expect(
      screen.getByRole("button", { name: /Kirim hasil ke/ }),
    ).toBeInTheDocument();
  });

  test("a signed-in member gets the saved card, no form and no referrer chrome", async () => {
    render(
      <DiscTest
        user={{ name: "Rani Putri", email: "rani@example.com" }}
        referrerName="Olivia"
      />,
    );
    completeTest("D");

    expect(screen.queryByLabelText(/Nama/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nomor WhatsApp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kirim hasil ke/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Lihat cara gabung" })).not.toBeInTheDocument();
    expect(screen.getByText("Rani Putri · rani@example.com")).toBeInTheDocument();

    expect(saveDiscLead).toHaveBeenCalledWith({
      name: "Rani Putri",
      contact: "rani@example.com",
      answers: DISC_QUESTIONS.map(() => "D"),
      ref: undefined,
    });
    expect(
      await screen.findByText(/Hasilnya tersimpan di akun kamu/),
    ).toBeInTheDocument();
  });
});

describe("the share card (Plan 23)", () => {
  test("is offered on the result whatever the visitor did about the ask", () => {
    render(<DiscTest />);
    completeTest("D");

    expect(
      screen.getByRole("button", { name: "Simpan gambar hasilnya" }),
    ).toBeInTheDocument();
  });

  test("is offered again in the sent state, next to /join", async () => {
    render(<DiscTest referrerName="Olivia" />);
    completeTest("D");

    fillLeadForm();
    fireEvent.click(screen.getByRole("button", { name: /Kirim hasil ke/ }));
    await screen.findByText(/Kekirim ke Olivia/);

    expect(
      screen.getByRole("button", { name: "Simpan gambar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Simpan gambar hasilnya" }),
    ).toBeInTheDocument();
  });

  test("a signed-in member can save the image too", () => {
    render(
      <DiscTest user={{ name: "Rani Putri", email: "rani@example.com" }} />,
    );
    completeTest("D");

    expect(
      screen.getByRole("button", { name: "Simpan gambar hasilnya" }),
    ).toBeInTheDocument();
  });
});
