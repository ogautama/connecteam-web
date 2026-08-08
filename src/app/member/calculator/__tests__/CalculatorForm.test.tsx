import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { requestPremium, saveQuoteAndRenderPdf } = vi.hoisted(() => ({
  requestPremium: vi.fn(),
  saveQuoteAndRenderPdf: vi.fn(),
}));

vi.mock("@/lib/premium/pricing", () => ({ requestPremium }));
vi.mock("@/lib/premium/quote", () => ({ saveQuoteAndRenderPdf }));

import CalculatorForm from "../CalculatorForm";

/** A priced 200 in requestPremium's single-term shape (paymentTerm sent). */
function pricedResponse(overrides: Record<string, unknown> = {}) {
  return {
    httpStatus: 200,
    body: {
      status: "success",
      data: {
        productDisplayName: "Pru Heritage Essential",
        planType: "Essential",
        gender: "Pria",
        smokingStatus: "Non Smoker",
        sumAssured: 1_000_000_000,
        insuranceAge: 35,
        paymentTerm: 10,
        annualPremium: 28_930_000,
        monthlyPremium: 2_460_000,
        discount: 0,
        annualPremiumBeforeDiscount: 28_930_000,
        monthlyPremiumBeforeDiscount: 2_460_000,
        ...overrides,
      },
    },
  };
}

function fillDob(value: string) {
  fireEvent.change(screen.getByLabelText("Tanggal lahir klien"), {
    target: { value },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Hitung Kontribusi" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CalculatorForm", () => {
  test("renders the three benefit tabs, leading with the benefit not the product", () => {
    render(<CalculatorForm />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining("Jiwa"),
      expect.stringContaining("Kritis"),
      expect.stringContaining("Kesehatan"),
    ]);
    // The product is the subdued chip line, not the tab itself.
    expect(screen.getByText("Pru Heritage Essential")).toBeInTheDocument();
  });

  test("selecting a tab swaps in its product's fields from the registry", () => {
    render(<CalculatorForm />);

    // Jiwa (life_PHE): single Essential plan, "until age" terms present.
    expect(screen.getByLabelText("Plan")).toContainHTML("Essential");
    expect(screen.getByRole("option", { name: "Sampai usia 99" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Kritis/ }));

    // Kritis (critical_PCA): Basic/Plus plans, duration-only terms.
    expect(screen.getByText("Pru Critical Amanah")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Basic" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Plus" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Sampai usia 99" })
    ).not.toBeInTheDocument();
  });

  test("a tab whose product the installed engine doesn't price shows Segera hadir", () => {
    render(<CalculatorForm />);

    fireEvent.click(screen.getByRole("tab", { name: /Kesehatan/ }));

    expect(screen.getByText("Segera hadir")).toBeInTheDocument();
    expect(screen.getByText("PruWell Medical")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Hitung Kontribusi" })
    ).not.toBeInTheDocument();
  });

  test("fixture: any category pointing at an unknown ProductId gets the same notice", () => {
    render(
      <CalculatorForm
        categories={[
          {
            id: "uji",
            label: "Uji",
            benefit: "Kategori fixture",
            productId: "fake_NOPE",
            productName: "Produk Uji",
          },
        ]}
      />
    );

    expect(screen.getByText("Segera hadir")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hitung Kontribusi" })).not.toBeInTheDocument();
  });

  test("a valid submission calls the pricing action and shows the priced result", async () => {
    requestPremium.mockResolvedValue(pricedResponse());
    render(<CalculatorForm />);

    fillDob("1992-08-17");
    submit();

    expect(await screen.findByText(/28\.930\.000/)).toBeInTheDocument();
    expect(screen.getByText(/2\.460\.000/)).toBeInTheDocument();
    expect(screen.getByText(/usia asuransi 35/)).toBeInTheDocument();
    expect(requestPremium).toHaveBeenCalledWith({
      productType: "life_PHE",
      planType: "Essential",
      dateOfBirth: "1992-08-17",
      gender: "Pria",
      smokingStatus: "Non Smoker",
      // The free-form field's pre-fill: Rp 1 miliar.
      sumAssured: 1_000_000_000,
      paymentTerm: 10,
    });
  });

  test("sum assured is free-form: pre-filled grouped, edits reprice at any amount", async () => {
    requestPremium.mockResolvedValue(pricedResponse());
    render(<CalculatorForm />);

    const sumAssured = screen.getByLabelText("Santunan Asuransi");
    expect(sumAssured).toHaveValue("1.000.000.000");

    // Not one of the old picklist options — any number goes through.
    fireEvent.change(sumAssured, { target: { value: "750000123" } });
    expect(sumAssured).toHaveValue("750.000.123");

    fillDob("1992-08-17");
    submit();

    await screen.findByText(/28\.930\.000/);
    expect(requestPremium).toHaveBeenCalledWith(
      expect.objectContaining({ sumAssured: 750_000_123 })
    );
  });

  test("an empty sum assured renders inline and never calls the pricing action", async () => {
    render(<CalculatorForm />);

    fillDob("1992-08-17");
    fireEvent.change(screen.getByLabelText("Santunan Asuransi"), {
      target: { value: "" },
    });
    submit();

    expect(
      await screen.findByText("Isi santunan asuransi dulu.")
    ).toBeInTheDocument();
    expect(requestPremium).not.toHaveBeenCalled();
  });

  test("shows the discount only when the engine applied one", async () => {
    requestPremium.mockResolvedValue(
      pricedResponse({
        discount: 0.05,
        annualPremiumBeforeDiscount: 30_450_000,
        monthlyPremiumBeforeDiscount: 2_590_000,
      })
    );
    render(<CalculatorForm />);

    fillDob("1992-08-17");
    submit();

    expect(await screen.findByText("Diskon 5% diterapkan")).toBeInTheDocument();
    expect(screen.getByText(/30\.450\.000/)).toBeInTheDocument();
  });

  test("an out-of-bounds DOB renders inline and never calls the pricing action", async () => {
    render(<CalculatorForm />);

    // Insurance age far beyond life_PHE's widest term bound (70).
    fillDob("1900-01-01");
    submit();

    expect(
      await screen.findByText("Usia di luar ketentuan produk ini.")
    ).toBeInTheDocument();
    expect(requestPremium).not.toHaveBeenCalled();
  });

  test("a missing DOB renders inline and never calls the pricing action", async () => {
    render(<CalculatorForm />);

    submit();

    expect(
      await screen.findByText("Isi tanggal lahir klien dulu.")
    ).toBeInTheDocument();
    expect(requestPremium).not.toHaveBeenCalled();
  });

  test("anything that slips past client validation surfaces the engine's 422 inline", async () => {
    // Mirrors handlePremiumRequest's own error shape — e.g. a stale cached
    // bound where the client schema passes but the server's doesn't.
    requestPremium.mockResolvedValue({
      httpStatus: 422,
      body: { status: "error", code: "AGE_OUT_OF_RANGE" },
    });
    render(<CalculatorForm />);

    fillDob("1992-08-17");
    submit();

    expect(
      await screen.findByText("Usia di luar ketentuan produk ini.")
    ).toBeInTheDocument();
  });

  test("editing an input after a result marks the shown price stale until resubmit", async () => {
    requestPremium.mockResolvedValue(pricedResponse());
    render(<CalculatorForm />);

    fillDob("1992-08-17");
    submit();
    await screen.findByText(/28\.930\.000/);
    expect(screen.queryByText(/Input berubah/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wanita" }));

    expect(screen.getByText(/Input berubah/)).toBeInTheDocument();

    // Resubmitting clears the stale marker again.
    submit();
    await vi.waitFor(() =>
      expect(screen.queryByText(/Input berubah/)).not.toBeInTheDocument()
    );
  });

  test("switching tabs after a result also marks it stale", async () => {
    requestPremium.mockResolvedValue(pricedResponse());
    render(<CalculatorForm />);

    fillDob("1992-08-17");
    submit();
    await screen.findByText(/28\.930\.000/);

    fireEvent.click(screen.getByRole("tab", { name: /Kritis/ }));

    expect(screen.getByText(/Input berubah/)).toBeInTheDocument();
  });
});

describe("CalculatorForm — Simpan & buat PDF (Plan 05c)", () => {
  /**
   * jsdom implements neither of these. `createObjectURL` records the Blob so a
   * test can check what was handed to the browser; the anchor click is
   * neutered because jsdom treats it as a navigation it can't perform.
   */
  const created: Blob[] = [];
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    created.length = 0;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return "blob:test";
    }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    requestPremium.mockResolvedValue(pricedResponse());
    saveQuoteAndRenderPdf.mockResolvedValue({
      ok: true,
      leadId: "lead_9",
      fileName: "Ilustrasi-Kontribusi-Dewi-2026-08-08.pdf",
      // "%PDF" — enough to prove the bytes reach the Blob unmangled.
      pdfBase64: "JVBERg==",
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  async function priceThenFillClient() {
    render(<CalculatorForm />);
    fillDob("1992-08-17");
    submit();
    await screen.findByText(/28\.930\.000/);

    fireEvent.change(screen.getByLabelText("Nama klien"), {
      target: { value: "Dewi Anggraini" },
    });
    fireEvent.change(screen.getByLabelText("Nomor WhatsApp"), {
      target: { value: "081234567890" },
    });
  }

  function save() {
    fireEvent.click(
      screen.getByRole("button", { name: "Simpan & buat PDF" })
    );
  }

  test("the save step only appears once there is a price to save", () => {
    render(<CalculatorForm />);

    expect(screen.queryByLabelText("Nama klien")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Simpan & buat PDF" })
    ).not.toBeInTheDocument();
  });

  test("sends the pricing inputs, not the shown price, alongside the client details", async () => {
    await priceThenFillClient();
    save();

    await screen.findByText(/Penawaran tersimpan/);
    expect(saveQuoteAndRenderPdf).toHaveBeenCalledWith({
      productType: "life_PHE",
      planType: "Essential",
      dateOfBirth: "1992-08-17",
      gender: "Pria",
      smokingStatus: "Non Smoker",
      sumAssured: 1_000_000_000,
      paymentTerm: 10,
      clientName: "Dewi Anggraini",
      phone: "081234567890",
      email: "",
    });
    // No premium of any kind on the wire — the server prices it again.
    const sent = saveQuoteAndRenderPdf.mock.calls[0][0];
    expect(Object.keys(sent)).not.toContain("annualPremium");
    expect(Object.keys(sent)).not.toContain("premi");
  });

  test("downloads the returned PDF and links to the saved lead", async () => {
    await priceThenFillClient();
    save();

    expect(await screen.findByText(/PDF terunduh/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat di Leads" })).toHaveAttribute(
      "href",
      "/member/leads/lead_9"
    );

    expect(created).toHaveLength(1);
    expect(created[0].type).toBe("application/pdf");
    // 4 bytes, not the 8 characters of "JVBERg==" — the base64 was decoded
    // rather than dropped into the Blob as text. (jsdom's Blob has no
    // `.text()`, so size is the assertion available here.)
    expect(created[0].size).toBe(4);
    expect(clickSpy).toHaveBeenCalled();
  });

  test("says so when the lead saved but the PDF didn't render", async () => {
    saveQuoteAndRenderPdf.mockResolvedValue({
      ok: true,
      leadId: "lead_9",
      fileName: "x.pdf",
      pdfBase64: null,
    });
    await priceThenFillClient();
    save();

    expect(
      await screen.findByText(/PDF-nya gagal dibuat/)
    ).toBeInTheDocument();
    expect(created).toHaveLength(0);
    // The lead is still there to open — the failure is the document, not the row.
    expect(screen.getByRole("link", { name: "Lihat di Leads" })).toBeInTheDocument();
  });

  test("renders a failure code as Indonesian copy, with nothing downloaded", async () => {
    saveQuoteAndRenderPdf.mockResolvedValue({
      ok: false,
      code: "CONTACT_REQUIRED",
    });
    await priceThenFillClient();
    save();

    expect(
      await screen.findByText("Isi nomor WhatsApp atau email klien.")
    ).toBeInTheDocument();
    expect(created).toHaveLength(0);
    expect(
      screen.queryByRole("link", { name: "Lihat di Leads" })
    ).not.toBeInTheDocument();
  });

  test("editing an input after saving hides the step and the confirmation", async () => {
    await priceThenFillClient();
    save();
    await screen.findByText(/Penawaran tersimpan/);

    fireEvent.click(screen.getByRole("button", { name: "Wanita" }));

    // Stale price → the save step is gone, and so is a confirmation that
    // would now be pointing at a different quote.
    expect(screen.queryByText(/Penawaran tersimpan/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Simpan & buat PDF" })
    ).not.toBeInTheDocument();
  });
});
