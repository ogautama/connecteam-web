import { describe, expect, test } from "vitest";
import { DISC_QUESTIONS, DISC_TRAITS } from "@/lib/disc/questions";
import { DISC_PROFILES } from "@/content/disc-profiles";

describe("DISC question bank", () => {
  test("has enough questions to separate the traits", () => {
    expect(DISC_QUESTIONS.length).toBeGreaterThanOrEqual(24);
  });

  test("every question offers exactly one statement per trait", () => {
    for (const question of DISC_QUESTIONS) {
      const traits = question.statements.map((s) => s.trait).sort();
      expect(traits, `question ${question.id}`).toEqual([...DISC_TRAITS].sort());
    }
  });

  test("no duplicate question ids", () => {
    const ids = DISC_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("no duplicate statements across the whole bank", () => {
    const statements = DISC_QUESTIONS.flatMap((q) =>
      q.statements.map((s) => s.text),
    );
    expect(new Set(statements).size).toBe(statements.length);
  });

  test("each trait appears equally often in every option position", () => {
    // Someone who skims and always picks near the top must not be nudged
    // toward one trait. The bank uses each of the 24 orderings of D/I/S/C
    // exactly once, so every trait lands in every position 6 times.
    const perPosition = DISC_QUESTIONS.length / DISC_TRAITS.length;

    for (let position = 0; position < DISC_TRAITS.length; position++) {
      const counts = DISC_QUESTIONS.reduce<Record<string, number>>((acc, q) => {
        const trait = q.statements[position].trait;
        acc[trait] = (acc[trait] ?? 0) + 1;
        return acc;
      }, {});

      for (const trait of DISC_TRAITS) {
        expect(counts[trait], `${trait} at position ${position}`).toBe(
          perPosition,
        );
      }
    }
  });
});

describe("DISC profile copy", () => {
  // Every result scoreDisc can produce — four single traits plus the six
  // two-trait blends, keyed in D-I-S-C order.
  const expectedKeys = [
    ...DISC_TRAITS,
    ...DISC_TRAITS.flatMap((a, i) =>
      DISC_TRAITS.slice(i + 1).map((b) => `${a}${b}`),
    ),
  ];

  test("covers every dominant-trait combination, and nothing else", () => {
    expect(Object.keys(DISC_PROFILES).sort()).toEqual([...expectedKeys].sort());
  });

  test("every profile is fully written", () => {
    for (const [key, profile] of Object.entries(DISC_PROFILES)) {
      expect(profile.title, key).toBeTruthy();
      expect(profile.blend, key).toBeTruthy();
      expect(profile.summary, key).toBeTruthy();
      expect(profile.atWork, key).toBeTruthy();
      expect(profile.watchOut, key).toBeTruthy();
      expect(profile.strengths.length, key).toBeGreaterThanOrEqual(3);
    }
  });
});
