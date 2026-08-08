// @vitest-environment node
//
// Node rather than the suite-wide jsdom, for the same reason as pdf.test.ts:
// this action really renders a PDF, and pdfmake takes a filesystem-less
// browser code path whenever a `window` global is present.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, createLead, findUnique } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createLead: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/leads", () => ({ createLead }));
vi.mock("@/lib/prisma", () => ({
  prisma: { memberIntake: { findUnique } },
}));

import { saveQuoteAndRenderPdf, type SaveQuoteInput } from "../quote";
import { PRODUCTS } from "@ogautama/premium-engine/public";

const member = {
  id: "member_1",
  name: "Budi (akun)",
  email: "budi@example.com",
  role: "agent" as const,
};

/**
 * DOB such that the engine's calculateInsuranceAge(dob, today) === targetAge.
 * Built relative to real "now" because the engine's DOB refine calls
 * `new Date()` internally (same helper as pricing.test.ts).
 */
function dobStringForInsuranceAge(targetAge: number): string {
  const today = new Date();
  const dob = new Date(
    today.getFullYear() - targetAge,
    today.getMonth(),
    today.getDate() + 1
  );
  return `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(
    dob.getDate()
  ).padStart(2, "0")}`;
}

function payload(overrides: Partial<SaveQuoteInput> = {}): SaveQuoteInput {
  return {
    productType: "critical_PCA",
    planType: "Basic",
    dateOfBirth: dobStringForInsuranceAge(28),
    gender: "Wanita",
    smokingStatus: "Non Smoker",
    sumAssured: 1_000_000_000,
    paymentTerm: 10,
    clientName: "  Sinta Rahayu  ",
    phone: "081234567890",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(member);
  findUnique.mockResolvedValue({
    fullName: "Budi Santoso",
    activePhone: "081200000000",
  });
  createLead.mockImplementation(async () => ({ id: "lead_1" }));
});

describe("saveQuoteAndRenderPdf", () => {
  it("rejects an unauthenticated call before touching the database", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(saveQuoteAndRenderPdf(payload())).rejects.toThrow(
      "Harus masuk sebagai member untuk menyimpan penawaran."
    );
    expect(createLead).not.toHaveBeenCalled();
  });

  it("saves a self-owned calculator lead with the priced result and returns a PDF", async () => {
    const result = await saveQuoteAndRenderPdf(payload());

    expect(result).toMatchObject({ ok: true, leadId: "lead_1" });
    expect(createLead).toHaveBeenCalledTimes(1);
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "calculator",
        name: "Sinta Rahayu",
        contact: "081234567890",
        ownerId: "member_1",
      })
    );

    const { inputs, result: stored } = createLead.mock.calls[0][0];
    expect(inputs).toMatchObject({
      productType: "critical_PCA",
      planType: "Basic",
      sumAssured: 1_000_000_000,
      paymentTerm: 10,
    });
    // The engine's own golden fixture for these inputs (see pricing.test.ts).
    expect(stored).toMatchObject({
      name: "Sinta Rahayu",
      productType: "critical_PCA",
      productDisplayName: PRODUCTS.critical_PCA.displayName,
      insuranceAge: 28,
      paymentTerm: 10,
      premi: 14_190_000,
      monthlyPremium: 1_290_000,
    });
    expect(stored.quotedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(result.ok && result.pdfBase64).toBeTruthy();
    const bytes = Buffer.from((result as { pdfBase64: string }).pdfBase64, "base64");
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(result.ok && result.fileName).toContain("Sinta-Rahayu");
  });

  it("falls back to email as the contact when no phone is given", async () => {
    await saveQuoteAndRenderPdf(
      payload({ phone: undefined, email: "sinta@example.com" })
    );

    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({ contact: "sinta@example.com" })
    );
  });

  it("writes no Lead when the client has neither phone nor email", async () => {
    const result = await saveQuoteAndRenderPdf(
      payload({ phone: "  ", email: "" })
    );

    expect(result).toEqual({ ok: false, code: "CONTACT_REQUIRED" });
    expect(createLead).not.toHaveBeenCalled();
  });

  it("writes no Lead when the client name is blank", async () => {
    const result = await saveQuoteAndRenderPdf(payload({ clientName: "   " }));

    expect(result).toEqual({ ok: false, code: "NAME_REQUIRED" });
    expect(createLead).not.toHaveBeenCalled();
  });

  /**
   * The price is recomputed from the inputs, never read off the request — a
   * client that posts its own premium alongside valid inputs gets the engine's
   * number stored and printed, not its own.
   */
  it("ignores a price posted by the client and stores the recomputed one", async () => {
    await saveQuoteAndRenderPdf({
      ...payload(),
      // Fields the action's type doesn't have, as a tampered POST would carry.
      ...({ premi: 1, annualPremium: 1, monthlyPremium: 1 } as object),
    });

    expect(createLead.mock.calls[0][0].result).toMatchObject({
      premi: 14_190_000,
      monthlyPremium: 1_290_000,
    });
  });

  it("reports the engine's failure code without writing a Lead", async () => {
    const tooOld = Math.max(
      ...Object.values(PRODUCTS.critical_PCA.termBounds).map((b) => b.maxAge)
    );
    const result = await saveQuoteAndRenderPdf(
      payload({ dateOfBirth: dobStringForInsuranceAge(tooOld + 1) })
    );

    expect(result).toEqual({ ok: false, code: "AGE_OUT_OF_RANGE" });
    expect(createLead).not.toHaveBeenCalled();
  });

  it("rejects a payment term this product does not offer", async () => {
    const result = await saveQuoteAndRenderPdf(payload({ paymentTerm: 99 }));

    expect(result).toEqual({ ok: false, code: "TERM_UNAVAILABLE" });
    expect(createLead).not.toHaveBeenCalled();
  });

  it("uses the member's intake name and phone as the document's preparer", async () => {
    await saveQuoteAndRenderPdf(payload());
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "member_1" } })
    );
  });

  it("still returns the saved lead when intake is missing (account name is enough)", async () => {
    findUnique.mockResolvedValue(null);

    const result = await saveQuoteAndRenderPdf(payload());

    expect(result).toMatchObject({ ok: true, leadId: "lead_1" });
    expect(result.ok && result.pdfBase64).toBeTruthy();
  });
});
