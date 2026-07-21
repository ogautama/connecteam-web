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

  test("statements are not all listed in the same trait order", () => {
    // A fixed D-I-S-C order in every question would bias whoever always picks
    // the first option, so the bank shuffles it.
    const firstTraits = new Set(DISC_QUESTIONS.map((q) => q.statements[0].trait));
    expect(firstTraits.size).toBeGreaterThan(1);
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
