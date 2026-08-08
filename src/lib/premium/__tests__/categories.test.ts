import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@ogautama/premium-engine/public";
import { BENEFIT_CATEGORIES, productFor } from "../categories";

describe("BENEFIT_CATEGORIES", () => {
  it("maps every ProductId the engine exports to exactly one category", () => {
    // Fails loudly when a future engine version adds a product nobody
    // categorized — the alternative is the calculator silently hiding it.
    for (const productId of Object.keys(PRODUCTS)) {
      const owners = BENEFIT_CATEGORIES.filter(
        (category) => category.productId === productId
      );
      expect(owners, `ProductId "${productId}" must be in exactly one category`)
        .toHaveLength(1);
    }
  });

  it("keeps category ids unique — they key the tab state", () => {
    const ids = BENEFIT_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves a live product's definition, and undefined for a future one", () => {
    const jiwa = BENEFIT_CATEGORIES.find((c) => c.id === "jiwa")!;
    const kesehatan = BENEFIT_CATEGORIES.find((c) => c.id === "kesehatan")!;

    expect(productFor(jiwa)?.id).toBe("life_PHE");
    // PruWell Medical isn't in premium-engine@0.1.0 — its tab renders the
    // "Segera hadir" notice off this undefined.
    expect(productFor(kesehatan)).toBeUndefined();
  });
});
