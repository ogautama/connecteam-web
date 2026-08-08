// @vitest-environment node
//
// Node, not the suite-wide jsdom: `renderQuotationPdf` runs pdfmake against
// real font files through `fs` and `fontkit`. Under jsdom a `window` global is
// present and pdfmake takes its browser code path, which has no filesystem.

import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@ogautama/premium-engine/server";
import { buildQuotationPdf, quotationFileName } from "../pdf";
import { CONNECTEAM_PDF_THEME } from "../theme";

const generatedAt = new Date(2026, 7, 8);

function terms(annual: number) {
  return [
    {
      paymentTerm: 10 as const,
      annualPremium: annual,
      monthlyPremium: Math.round(annual / 11),
      discount: 0,
      annualPremiumBeforeDiscount: annual,
      monthlyPremiumBeforeDiscount: Math.round(annual / 11),
    },
  ];
}

function pcaInput(overrides: Record<string, unknown> = {}) {
  return {
    productId: "critical_PCA" as const,
    productDisplayName: PRODUCTS.critical_PCA.displayName,
    planType: "Basic" as const,
    dateOfBirth: new Date(1998, 7, 9),
    insuranceAge: 28,
    gender: "Wanita" as const,
    smokingStatus: "Non Smoker" as const,
    sumAssured: 1_000_000_000,
    paymentTerm: 10 as const,
    terms: terms(14_190_000),
    agentName: "Budi Santoso",
    agentPhone: "081234567890",
    generatedAt,
    ...overrides,
  };
}

describe("buildQuotationPdf", () => {
  it("renders a real PDF for critical_PCA", async () => {
    const pdf = await buildQuotationPdf(pcaInput());

    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders a real PDF for life_PHE (booster schedule path)", async () => {
    const pdf = await buildQuotationPdf(
      pcaInput({
        productId: "life_PHE",
        productDisplayName: PRODUCTS.life_PHE.displayName,
        planType: "Essential",
        terms: terms(9_000_000),
      })
    );

    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  /**
   * The renderer takes its numbers from `terms`, never from anything a client
   * could have posted — this is the guard that a tampered price can't reach
   * the document.
   *
   * Compared by byte *length*, not by `equals`: every PDF embeds a CreationDate,
   * so two renders of the same input are never byte-identical. Length is blind
   * to that fixed-width timestamp but not to a premium with a different digit
   * count, which makes it the assertion that actually distinguishes the two.
   */
  it("embeds the premium it was handed, so a different price is a different document", async () => {
    const [honest, tampered, repeat] = await Promise.all([
      buildQuotationPdf(pcaInput()),
      buildQuotationPdf(pcaInput({ terms: terms(1_000) })),
      buildQuotationPdf(pcaInput()),
    ]);

    expect(repeat.length).toBe(honest.length);
    expect(tampered.length).not.toBe(honest.length);
  });
});

describe("CONNECTEAM_PDF_THEME", () => {
  it("carries CONNECTeam's brand name and a full six-step benefit ramp", () => {
    expect(CONNECTEAM_PDF_THEME.brandName).toBe("CONNECTeam");
    expect(CONNECTEAM_PDF_THEME.colors.benefitRamp).toHaveLength(6);
    for (const color of [
      CONNECTEAM_PDF_THEME.colors.brand,
      CONNECTEAM_PDF_THEME.colors.protection,
      CONNECTEAM_PDF_THEME.colors.payment,
      CONNECTEAM_PDF_THEME.colors.tint,
      CONNECTEAM_PDF_THEME.colors.rampDark,
      CONNECTEAM_PDF_THEME.colors.rampLight,
      CONNECTEAM_PDF_THEME.colors.rampLightText,
      ...CONNECTEAM_PDF_THEME.colors.benefitRamp,
    ]) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  /**
   * Guards the comment in theme.ts: `logo` is deliberately unset because
   * engine 0.1.0's renderer never reads it. If a future engine starts drawing
   * a logo, this fails and whoever bumps the package supplies one.
   */
  it("omits the logo, which engine 0.1.0's renderer does not draw", () => {
    expect(CONNECTEAM_PDF_THEME.logo).toBeUndefined();
  });
});

describe("quotationFileName", () => {
  it("slugifies the client name and stamps the local date", () => {
    expect(quotationFileName("Sinta Rahayu", generatedAt)).toBe(
      "Ilustrasi-Kontribusi-Sinta-Rahayu-2026-08-08.pdf"
    );
  });

  it("falls back rather than producing a nameless file", () => {
    expect(quotationFileName("!!!", generatedAt)).toBe(
      "Ilustrasi-Kontribusi-Klien-2026-08-08.pdf"
    );
  });
});
