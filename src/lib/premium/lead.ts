import type {
  Gender,
  LeadRecord,
  PaymentTerm,
  PlanId,
  ProductId,
  SmokingStatus,
} from "@ogautama/premium-engine/public";

// Types only, and only from the client-safe "/public" entry — the leads pages
// import this module, so nothing here may drag in "/server" or "/pdf".

/**
 * What a `source: "calculator"` Lead keeps in `result` (Plan 05c).
 *
 * Built on the engine's own `LeadRecord` so the stored shape stays recognisable
 * to anything else that speaks that vocabulary, widened with the fields the
 * agent actually saw on screen. `LeadRecord` alone carries only `premi` (the
 * annual figure), and a quote the agent read as "Rp 1.250.000/bulan over 10
 * years" would lose both the monthly number and the term — which is most of
 * what they told the client.
 *
 * `referral` is deliberately never set: a calculator quote has no referral
 * link. Every one is self-owned by the agent who ran it (see `quote.ts`).
 */
export type CalculatorLeadResult = LeadRecord & {
  productType: ProductId;
  planType: PlanId;
  gender: Gender;
  smokingStatus: SmokingStatus;
  /** Marketing name, so the leads UI needn't map ProductId → label itself. */
  productDisplayName: string;
  paymentTerm: PaymentTerm;
  insuranceAge: number;
  monthlyPremium: number;
  /** 0–1. Always 0 for critical_PCA, which has no discount bands. */
  discount: number;
  annualPremiumBeforeDiscount: number;
  monthlyPremiumBeforeDiscount: number;
  /**
   * ISO instant the premium was computed at. A premium depends on the client's
   * insurance age *on the quote date* and on the rate tables in force then, so
   * without this the row records a number nobody can reproduce. `createdAt`
   * would normally be the same instant, but this one belongs to the quote, not
   * to the row.
   */
  quotedAt: string;
};

/**
 * Reads a calculator lead's `result` column.
 *
 * The cast goes through `unknown` because Prisma types the column as
 * `JsonValue`, and TypeScript refuses a direct assertion to a type carrying
 * optional properties (`phone?`) — `undefined` is not a JSON value, so the two
 * don't overlap enough for a single-step cast. Nothing is being checked here
 * that wasn't already: the shape is guaranteed by `quote.ts` being the only
 * writer of `source: "calculator"` rows, exactly as the DISC pages trust
 * `saveDiscLead`.
 */
export function calculatorLeadResult(value: unknown): CalculatorLeadResult {
  return value as unknown as CalculatorLeadResult;
}

/** What the same Lead keeps in `inputs` — what the agent typed, as typed. */
export type CalculatorLeadInputs = {
  productType: ProductId;
  planType: PlanId;
  /** "YYYY-MM-DD", never a Date — round-tripping a DOB through Date is exactly
   * how it shifts a day across timezones. */
  dateOfBirth: string;
  gender: Gender;
  smokingStatus: SmokingStatus;
  sumAssured: number;
  paymentTerm: PaymentTerm;
};
