// IRON RULE (same as pricing.ts): anything importing
// "@ogautama/premium-engine/server" or "/pdf" must stay server-side. This
// module is not a Server Action itself — it has no "use server" directive on
// purpose, so it exposes no extra action endpoint — it is a plain module
// imported only by `quote.ts`, which is one. Keep it that way: importing this
// from a client component would drag the rate tables, pdfmake, and the font
// files into a browser bundle.

import {
  loadProductContent,
  makeServerTranslate,
  renderQuotationPdf,
  type QuotationPdfData,
  type QuotationTermRow,
} from "@ogautama/premium-engine/pdf";
import {
  pcaBenefitSchedule,
  pheBoosterSchedule,
  type Gender,
  type PaymentTerm,
  type PlanId,
  type ProductId,
  type SmokingStatus,
} from "@ogautama/premium-engine/server";
import { CONNECTEAM_PDF_THEME } from "@/lib/premium/theme";

/**
 * The document is Indonesian-only. This app has no locale switcher — every
 * surface is `id` — and the engine's `id` catalog already carries the sharia
 * wording this repo settled on (2026-08-08): "Kontribusi", "Santunan".
 */
const LOCALE = "id";

/**
 * Whether the premium table prints its discount breakdown. Per-product rather
 * than "does any term have a nonzero discount", because a life_PHE quote below
 * every discount band legitimately returns 0% on every term without meaning
 * the product has no discount mechanic. In engine 0.1.0 only life_PHE has
 * discount bands at all — `calculatePca` hardcodes `discount: 0` — so showing
 * the columns for critical_PCA would print a permanent no-op.
 */
const HAS_DISCOUNT: Record<ProductId, boolean> = {
  life_PHE: true,
  critical_PCA: false,
};

export type QuotationPdfInput = {
  productId: ProductId;
  productDisplayName: string;
  planType: PlanId;
  dateOfBirth: Date;
  insuranceAge: number;
  gender: Gender;
  smokingStatus: SmokingStatus;
  sumAssured: number;
  /** The term the agent priced — highlighted as "standar" in the document. */
  paymentTerm: PaymentTerm;
  /** Every term the engine could price for these inputs, ascending. */
  terms: QuotationTermRow[];
  agentName: string;
  agentPhone?: string;
  /** The same instant the quote was priced at — never a second `new Date()`. */
  generatedAt: Date;
};

/**
 * Assembles `QuotationPdfData` and renders it under CONNECTeam's theme.
 *
 * The caller supplies an already-priced `terms` array rather than inputs to
 * price: `quote.ts` prices once and feeds both the stored Lead and this
 * document from that one result, so the PDF can never disagree with the row
 * saved seconds earlier (see Plan 05c's recompute-every-time rule).
 */
export async function buildQuotationPdf(
  input: QuotationPdfInput
): Promise<Buffer> {
  const content = loadProductContent(input.productId, LOCALE);
  if (!content) {
    // Both engine 0.1.0 products ship a content file, so this is a "the
    // package changed under us" signal, not a user-facing case.
    throw new Error(
      `Konten produk ${input.productId} tidak tersedia di premium-engine.`
    );
  }

  const data: QuotationPdfData = {
    locale: LOCALE,
    productDisplayName: input.productDisplayName,
    planType: input.planType,
    dateOfBirth: input.dateOfBirth,
    insuranceAge: input.insuranceAge,
    gender: input.gender,
    smokingStatus: input.smokingStatus,
    sumAssured: input.sumAssured,
    defaultPaymentTerm: input.paymentTerm,
    terms: input.terms,
    // Product mechanics the document draws as a chart/table. Each is defined
    // for exactly one product; passing the wrong one renders a section that
    // makes no sense for the product.
    boosterSchedule:
      input.productId === "life_PHE"
        ? pheBoosterSchedule(input.insuranceAge, input.sumAssured)
        : undefined,
    pcaBenefitSchedule:
      input.productId === "critical_PCA"
        ? pcaBenefitSchedule(input.sumAssured)
        : undefined,
    hasDiscount: HAS_DISCOUNT[input.productId],
    agentName: input.agentName,
    agentPhone: input.agentPhone,
    generatedAt: input.generatedAt,
  };

  return renderQuotationPdf(
    data,
    content,
    makeServerTranslate(LOCALE),
    CONNECTEAM_PDF_THEME
  );
}

/** `Ilustrasi-Kontribusi-Budi-Santoso-2026-08-08.pdf` — safe on every OS. */
export function quotationFileName(clientName: string, at: Date): string {
  const slug =
    clientName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "Klien";
  const date = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(
    at.getDate()
  ).padStart(2, "0")}`;
  return `Ilustrasi-Kontribusi-${slug}-${date}.pdf`;
}
