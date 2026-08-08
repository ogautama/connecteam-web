"use server";

// IRON RULE (premium-engine README §"server-only"): anything importing
// "@ogautama/premium-engine/server" or "/pdf" must live in a server-only file.
// This one is a "use server" action module; `./pdf` is a plain module that only
// this file imports, so the renderer and the rate tables stay off the client.

import {
  handlePremiumRequest,
  parseLocalDate,
  PRODUCTS,
  type Gender,
  type PlanId,
  type ProductDefinition,
  type SmokingStatus,
} from "@ogautama/premium-engine/server";
import type { QuotationTermRow } from "@ogautama/premium-engine/pdf";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/lib/leads";
import { buildQuotationPdf, quotationFileName } from "@/lib/premium/pdf";
import type {
  CalculatorLeadInputs,
  CalculatorLeadResult,
} from "@/lib/premium/lead";

/**
 * WHY NOT `handleQuoteRequest` (which Plan 05c named, and which exists for
 * exactly this "price it and hand me a lead" job):
 *
 *  1. Its schema pins `sumAssured` to `def.sumAssuredOptions` — four fixed
 *     amounts. Plan 05b shipped a free-form sum assured on purpose, because
 *     pricing arbitrary amounts is the whole point of an agent surface. Routing
 *     quotes through it would reject most real ones.
 *  2. It ignores `paymentTerm` entirely and always prices the product default,
 *     so an agent who quoted "sampai usia 99" would have "10 tahun" saved
 *     against their client's name.
 *  3. Its honeypot branch guards a public form. This action is member-only —
 *     `getCurrentUser()` below — so there is no anonymous path to protect, and
 *     no honeypot field for the client to fill.
 *
 * `handlePremiumRequest` — the same entry point Plan 05a's `pricing.ts` uses —
 * has neither restriction, so the price stored here is the price the agent saw.
 * The engine's `LeadRecord` vocabulary is preserved: `lead.ts` builds that
 * shape, just app-side. Revisit if the engine ever relaxes the quote schema.
 */

export type SaveQuoteInput = {
  productType: string;
  planType: string;
  /** "YYYY-MM-DD" as the date input produced it. */
  dateOfBirth: string;
  gender: string;
  smokingStatus: string;
  sumAssured: number | undefined;
  paymentTerm: number;
  clientName: string;
  phone?: string;
  email?: string;
};

export type SaveQuoteFailure =
  | "NAME_REQUIRED"
  | "CONTACT_REQUIRED"
  | "UNKNOWN_PRODUCT"
  | "TERM_UNAVAILABLE"
  | "AGE_OUT_OF_RANGE"
  | "RATE_NOT_AVAILABLE"
  | "UNKNOWN_PLAN"
  | "VALIDATION_FAILED";

export type SaveQuoteResult =
  | {
      ok: true;
      leadId: string;
      fileName: string;
      /** Base64 PDF, or null when the lead saved but the render failed. */
      pdfBase64: string | null;
    }
  | { ok: false; code: SaveQuoteFailure };

/**
 * The calculator's "Simpan & buat PDF" step: prices the quote server-side,
 * stores it as a `source: "calculator"` Lead, and renders the branded PDF.
 *
 * ONE PRICING, TWO CONSUMERS — deliberately (Plan 05c). The plan sketched
 * separate quote and PDF actions and then flagged the hazard itself: two
 * independent pricings seconds apart can straddle midnight, and if that
 * midnight is the client's insurance-age boundary the PDF quietly contradicts
 * the row just saved. Doing both from a single `quoteDate` removes the failure
 * mode rather than guarding against it, and costs the agent one round trip
 * instead of two.
 *
 * The premium is computed here, from the inputs — never read off the request.
 * A client that posts its own price simply has it ignored.
 */
export async function saveQuoteAndRenderPdf(
  input: SaveQuoteInput
): Promise<SaveQuoteResult> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Harus masuk sebagai member untuk menyimpan penawaran.");
  }

  const clientName = input.clientName?.trim() ?? "";
  const phone = input.phone?.trim() || undefined;
  const email = input.email?.trim() || undefined;
  if (!clientName) return { ok: false, code: "NAME_REQUIRED" };
  // Contact is what makes a lead followable — a row with neither is a dead
  // record. Phone wins when both are given: this is a WhatsApp-first team.
  if (!phone && !email) return { ok: false, code: "CONTACT_REQUIRED" };

  const product = (PRODUCTS as Record<string, ProductDefinition>)[
    input.productType
  ];
  if (!product) return { ok: false, code: "UNKNOWN_PRODUCT" };

  // Priced without a `paymentTerm` on purpose: that asks the engine for every
  // term it can price, which is what the PDF's comparison table needs. The
  // agent's chosen term is picked out of the result below.
  const quoteDate = new Date();
  const priced = handlePremiumRequest(
    {
      productType: input.productType,
      planType: input.planType,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      smokingStatus: input.smokingStatus,
      sumAssured: input.sumAssured,
    },
    quoteDate
  );
  if (priced.httpStatus !== 200) {
    const code = (priced.body as { code?: string }).code;
    return { ok: false, code: asFailure(code) };
  }

  const data = priced.body.data as {
    productDisplayName: string;
    insuranceAge: number;
    terms: QuotationTermRow[];
  };
  const chosen = data.terms.find((t) => t.paymentTerm === input.paymentTerm);
  // Reachable without any tampering: a term can be unavailable at this
  // client's age while others price fine (ProductDefinition.termBounds).
  if (!chosen) return { ok: false, code: "TERM_UNAVAILABLE" };

  const dateOfBirth = parseLocalDate(input.dateOfBirth);
  if (!dateOfBirth) return { ok: false, code: "VALIDATION_FAILED" };

  // Narrowing casts, not assumptions: `handlePremiumRequest` returned 200,
  // which means its zod schema already accepted each of these against this
  // product's own definition. Anything it would have rejected left through the
  // non-200 branch above.
  const productId = product.id;
  const planType = input.planType as PlanId;
  const gender = input.gender as Gender;
  const smokingStatus = input.smokingStatus as SmokingStatus;
  const sumAssured = input.sumAssured as number;

  const inputs: CalculatorLeadInputs = {
    productType: productId,
    planType,
    dateOfBirth: input.dateOfBirth,
    gender,
    smokingStatus,
    sumAssured,
    paymentTerm: chosen.paymentTerm,
  };

  const result: CalculatorLeadResult = {
    name: clientName,
    gender,
    dateOfBirth: input.dateOfBirth,
    phone,
    email,
    smokingStatus,
    productType: productId,
    planType,
    productDisplayName: data.productDisplayName,
    sumAssured,
    premi: chosen.annualPremium,
    paymentTerm: chosen.paymentTerm,
    insuranceAge: data.insuranceAge,
    monthlyPremium: chosen.monthlyPremium,
    discount: chosen.discount,
    annualPremiumBeforeDiscount: chosen.annualPremiumBeforeDiscount,
    monthlyPremiumBeforeDiscount: chosen.monthlyPremiumBeforeDiscount,
    source: "member-calculator",
    quotedAt: quoteDate.toISOString(),
  };

  // Owner is always the signed-in agent — a calculator quote is never reached
  // anonymously, so there is no `ref` to resolve and nothing to trust from the
  // client. Visibility up the chain then follows Plan 16's hierarchy, the same
  // as a DISC lead (a deliberate call, recorded in Plan 05c).
  const lead = await createLead({
    source: "calculator",
    name: clientName,
    contact: phone ?? email!,
    inputs,
    result,
    ownerId: user.id,
  });

  // Saved first, rendered second: the Lead is the durable record and must not
  // be lost to a rendering bug. If the PDF fails the agent still has the quote
  // and can retry from the leads list.
  let pdfBase64: string | null = null;
  try {
    const agent = await agentIdentity(user.id, user.name);
    const pdf = await buildQuotationPdf({
      productId,
      productDisplayName: data.productDisplayName,
      planType,
      dateOfBirth,
      insuranceAge: data.insuranceAge,
      gender,
      smokingStatus,
      sumAssured,
      paymentTerm: chosen.paymentTerm,
      terms: data.terms,
      agentName: agent.name,
      agentPhone: agent.phone,
      generatedAt: quoteDate,
    });
    pdfBase64 = pdf.toString("base64");
  } catch (error) {
    console.error("quotation PDF render failed", { leadId: lead.id, error });
  }

  return {
    ok: true,
    leadId: lead.id,
    fileName: quotationFileName(clientName, quoteDate),
    pdfBase64,
  };
}

/**
 * Who the document says prepared it. Taken from the member's own intake form
 * rather than a field on the quote — an agent shouldn't retype their name and
 * number for every client, and a typo there is a client calling a wrong number.
 * Falls back to the account name when intake isn't filled in yet.
 */
async function agentIdentity(
  userId: string,
  accountName: string
): Promise<{ name: string; phone?: string }> {
  const intake = await prisma.memberIntake.findUnique({
    where: { userId },
    select: { fullName: true, activePhone: true },
  });
  return {
    name: intake?.fullName?.trim() || accountName,
    phone: intake?.activePhone?.trim() || undefined,
  };
}

const ENGINE_FAILURES: readonly SaveQuoteFailure[] = [
  "AGE_OUT_OF_RANGE",
  "RATE_NOT_AVAILABLE",
  "UNKNOWN_PLAN",
  "UNKNOWN_PRODUCT",
  "VALIDATION_FAILED",
];

function asFailure(code: string | undefined): SaveQuoteFailure {
  return ENGINE_FAILURES.includes(code as SaveQuoteFailure)
    ? (code as SaveQuoteFailure)
    : "VALIDATION_FAILED";
}
