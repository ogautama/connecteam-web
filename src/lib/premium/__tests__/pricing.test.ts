import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser }));

import { requestPremium } from "../pricing";
import { PRODUCTS } from "@ogautama/premium-engine/public";

const member = {
  id: "member_1",
  name: "Budi",
  email: "budi@example.com",
  role: "agent",
};

/**
 * DOB such that the engine's calculateInsuranceAge(dob, quoteDate) === targetAge.
 * Copied from premium-engine's own handlePremiumRequest.test.ts: built relative
 * to real "now" because the engine's DOB refine calls `new Date()` internally.
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

// The golden fixture from premium-engine's handlePremiumRequest.test.ts —
// not an invented pair. If the engine's promise drifts, this drifts with it
// and the assertion below catches the mismatch on our side.
function goldenPayload(overrides: Record<string, unknown> = {}) {
  return {
    productType: "critical_PCA",
    planType: "Basic",
    dateOfBirth: dobStringForInsuranceAge(28),
    gender: "Wanita",
    smokingStatus: "Non Smoker",
    sumAssured: 1_000_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(member);
});

describe("requestPremium", () => {
  it("rejects when there is no signed-in member", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(requestPremium(goldenPayload())).rejects.toThrow(
      "Harus masuk sebagai member untuk menghitung premi."
    );
  });

  it("golden case: critical_PCA Wanita Non-Smoker Basic 1B age 28 prices to the engine's own fixture", async () => {
    const result = await requestPremium(goldenPayload());

    expect(result.httpStatus).toBe(200);
    expect(result.body).toMatchObject({
      status: "success",
      data: {
        insuranceAge: 28,
        productDisplayName: PRODUCTS.critical_PCA.displayName,
        planType: "Basic",
        terms: expect.arrayContaining([
          expect.objectContaining({
            paymentTerm: PRODUCTS.critical_PCA.defaultPaymentTerm,
            annualPremium: 14_190_000,
            monthlyPremium: 1_290_000,
          }),
        ]),
      },
    });
  });

  it("age beyond every term returns the engine's 422 AGE_OUT_OF_RANGE shape, not a throw", async () => {
    const widestMaxAge = Math.max(
      ...Object.values(PRODUCTS.critical_PCA.termBounds).map((b) => b.maxAge)
    );

    const result = await requestPremium(
      goldenPayload({ dateOfBirth: dobStringForInsuranceAge(widestMaxAge + 1) })
    );

    expect(result.httpStatus).toBe(422);
    expect(result.body).toMatchObject({
      status: "error",
      code: "AGE_OUT_OF_RANGE",
    });
  });
});
