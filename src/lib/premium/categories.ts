import {
  PRODUCTS,
  type ProductDefinition,
} from "@ogautama/premium-engine/public";

/**
 * The calculator's benefit-first picker (Plan 05b): the top-level choice is a
 * benefit category, not a product name — the selling emphasis is what the
 * product does for the client. The engine's PRODUCTS registry has no category
 * field, so this mapping (and each tab's benefit copy) lives app-side.
 *
 * `productId` is a plain string, not the engine's ProductId union: a category
 * may point at a product the installed engine version doesn't price yet
 * (Kesehatan → PruWell Medical). Such a tab renders a "Segera hadir" notice;
 * when a future engine version ships the product, the tab lights up without
 * touching the picker. The categories test keeps this map complete — every
 * ProductId the engine exports must appear in exactly one category.
 */
export type BenefitCategory = {
  id: string;
  /** Tab label — the benefit, e.g. "Jiwa". */
  label: string;
  /** One-liner under the label: what the client gets. */
  benefit: string;
  /** Engine ProductId, possibly one the installed version doesn't export yet. */
  productId: string;
  /** Display name for the product chip when the engine can't supply one. */
  productName: string;
};

export const BENEFIT_CATEGORIES: BenefitCategory[] = [
  {
    id: "jiwa",
    label: "Jiwa",
    benefit: "Warisan & perlindungan jiwa untuk keluarga",
    productId: "life_PHE",
    productName: "Pru Heritage Essential",
  },
  {
    id: "kritis",
    label: "Kritis",
    benefit: "UP cair saat terdiagnosis penyakit kritis",
    productId: "critical_PCA",
    productName: "Pru Critical Amanah",
  },
  {
    id: "kesehatan",
    label: "Kesehatan",
    benefit: "Biaya rawat inap sesuai wilayah pertanggungan",
    // Not in premium-engine@0.1.0 — the tab shows "Segera hadir" until the
    // engine ships PruWell Medical and this id matches its ProductId.
    productId: "medical_PWM",
    productName: "PruWell Medical",
  },
];

/** The installed engine's definition for a category's product, or undefined
 * when this engine version doesn't price it (the "Segera hadir" case). */
export function productFor(
  category: BenefitCategory
): ProductDefinition | undefined {
  return (PRODUCTS as Record<string, ProductDefinition>)[category.productId];
}
