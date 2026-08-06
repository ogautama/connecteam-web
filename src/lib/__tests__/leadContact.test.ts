import { describe, expect, it } from "vitest";
import { waLink, waNumber } from "@/lib/leadContact";

describe("waNumber", () => {
  it("swaps a leading 0 for the country code", () => {
    expect(waNumber("0812-3456-7890")).toBe("6281234567890");
  });

  it("strips a leading + and keeps the country code", () => {
    expect(waNumber("+62 812 3456 7890")).toBe("6281234567890");
  });

  it("leaves an already-62-prefixed number alone", () => {
    expect(waNumber("6281234567890")).toBe("6281234567890");
  });

  it("prepends the country code to a bare local number", () => {
    expect(waNumber("81234567890")).toBe("6281234567890");
  });

  it("strips non-digit separators throughout, not just leading ones", () => {
    expect(waNumber("(0812) 3456-7890")).toBe("6281234567890");
  });
});

describe("waLink", () => {
  it("builds a wa.me URL from the normalized number", () => {
    expect(waLink("0812-3456-7890")).toBe("https://wa.me/6281234567890");
  });
});
