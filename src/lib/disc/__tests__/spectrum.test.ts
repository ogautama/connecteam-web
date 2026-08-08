import { describe, expect, test } from "vitest";

import { spectrumWidths } from "@/lib/disc/spectrum";
import { DISC_QUESTIONS, DISC_TRAITS } from "@/lib/disc/questions";
import { scoreDisc } from "@/lib/disc/score";

describe("spectrumWidths", () => {
  test("closes the bar at 100 even when the rounding doesn't", () => {
    // 21 + 13 + 33 + 33 = 100 only because the last segment absorbs it —
    // score.ts rounds each trait independently.
    const widths = spectrumWidths({ D: 21, I: 13, S: 33, C: 34 });

    expect(widths.D + widths.I + widths.S + widths.C).toBe(100);
    expect(widths.D).toBe(21);
    expect(widths.I).toBe(13);
    expect(widths.S).toBe(33);
  });

  test("every real answer sheet produces a bar that closes", () => {
    for (const trait of DISC_TRAITS) {
      const result = scoreDisc(DISC_QUESTIONS.map(() => trait));
      const widths = spectrumWidths(result.percentages);
      const total = DISC_TRAITS.reduce((sum, t) => sum + widths[t], 0);
      expect(total).toBe(100);
    }
  });

  test("never goes negative when the rounding overshoots", () => {
    const widths = spectrumWidths({ D: 34, I: 34, S: 34, C: 0 });

    expect(widths.C).toBe(0);
  });
});
