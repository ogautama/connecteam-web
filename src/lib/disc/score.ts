import { DISC_TRAITS, type DiscTrait } from "@/lib/disc/questions";

export type DiscScores = Record<DiscTrait, number>;

export type DiscResult = {
  /** Raw tally — one point per answered question. */
  scores: DiscScores;
  /** Share of the total, rounded. May not sum to exactly 100. */
  percentages: DiscScores;
  /** One or two traits, always in canonical D-I-S-C order. */
  dominant: DiscTrait[];
  /** `dominant` joined — the key into the profile copy, e.g. "D" or "DI". */
  profileKey: string;
};

// How close the runner-up has to be to count as part of a two-trait blend.
// One question's worth of difference is noise, not a distinguishing signal.
const BLEND_MARGIN = 1;

function isDiscTrait(value: unknown): value is DiscTrait {
  return DISC_TRAITS.includes(value as DiscTrait);
}

/**
 * Tallies forced-choice answers (one trait per answered question) into trait
 * scores and the dominant 1-2 trait profile.
 *
 * The dominant set is the top trait plus the runner-up when it's within
 * `BLEND_MARGIN`. A completely flat result (three or four traits tied at the
 * top) is capped at the first two in D-I-S-C order so the profile key stays
 * one of the ten written combinations.
 */
export function scoreDisc(answers: readonly DiscTrait[]): DiscResult {
  if (answers.length === 0) {
    throw new Error("scoreDisc: no answers to score");
  }

  const scores: DiscScores = { D: 0, I: 0, S: 0, C: 0 };
  for (const answer of answers) {
    if (!isDiscTrait(answer)) {
      throw new Error(`scoreDisc: not a DISC trait: ${String(answer)}`);
    }
    scores[answer] += 1;
  }

  const total = answers.length;
  const percentages: DiscScores = { D: 0, I: 0, S: 0, C: 0 };
  for (const trait of DISC_TRAITS) {
    percentages[trait] = Math.round((scores[trait] / total) * 100);
  }

  // Sort by score, falling back to canonical order so ties are deterministic.
  const ranked = [...DISC_TRAITS].sort((a, b) => scores[b] - scores[a]);
  const [top, runnerUp] = ranked;
  const dominant =
    scores[top] - scores[runnerUp] <= BLEND_MARGIN ? [top, runnerUp] : [top];

  dominant.sort((a, b) => DISC_TRAITS.indexOf(a) - DISC_TRAITS.indexOf(b));

  return { scores, percentages, dominant, profileKey: dominant.join("") };
}
