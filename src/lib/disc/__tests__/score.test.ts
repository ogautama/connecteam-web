import { describe, expect, test } from "vitest";
import { scoreDisc } from "@/lib/disc/score";
import type { DiscTrait } from "@/lib/disc/questions";

// Builds an answer sheet with the given tally, e.g. { D: 12, I: 4, S: 4, C: 4 }.
function answersFor(tally: Partial<Record<DiscTrait, number>>): DiscTrait[] {
  return Object.entries(tally).flatMap(([trait, count]) =>
    Array<DiscTrait>(count).fill(trait as DiscTrait),
  );
}

describe("scoreDisc", () => {
  test("a clear D result reports D alone as dominant", () => {
    const result = scoreDisc(answersFor({ D: 12, I: 4, S: 4, C: 4 }));

    expect(result.scores).toEqual({ D: 12, I: 4, S: 4, C: 4 });
    expect(result.percentages).toEqual({ D: 50, I: 17, S: 17, C: 17 });
    expect(result.dominant).toEqual(["D"]);
    expect(result.profileKey).toBe("D");
  });

  test("a tied D/I result reports both, in D-I-S-C order", () => {
    const result = scoreDisc(answersFor({ I: 9, D: 9, S: 3, C: 3 }));

    expect(result.scores).toEqual({ D: 9, I: 9, S: 3, C: 3 });
    expect(result.dominant).toEqual(["D", "I"]);
    expect(result.profileKey).toBe("DI");
  });

  test("an all-S result reports S alone", () => {
    const result = scoreDisc(answersFor({ S: 24 }));

    expect(result.scores).toEqual({ D: 0, I: 0, S: 24, C: 0 });
    expect(result.percentages).toEqual({ D: 0, I: 0, S: 100, C: 0 });
    expect(result.dominant).toEqual(["S"]);
    expect(result.profileKey).toBe("S");
  });

  test("a runner-up one point behind still counts as a blend", () => {
    const result = scoreDisc(answersFor({ S: 10, C: 9, D: 3, I: 2 }));

    expect(result.dominant).toEqual(["S", "C"]);
    expect(result.profileKey).toBe("SC");
  });

  test("a runner-up two points behind does not", () => {
    const result = scoreDisc(answersFor({ S: 10, C: 8, D: 3, I: 3 }));

    expect(result.dominant).toEqual(["S"]);
  });

  test("a completely flat result caps at the first two traits", () => {
    const result = scoreDisc(answersFor({ D: 6, I: 6, S: 6, C: 6 }));

    expect(result.dominant).toEqual(["D", "I"]);
    expect(result.profileKey).toBe("DI");
  });

  test("rejects empty and non-trait answers", () => {
    expect(() => scoreDisc([])).toThrow(/no answers/i);
    expect(() => scoreDisc(["D", "X" as DiscTrait])).toThrow(/not a DISC trait/i);
  });
});
