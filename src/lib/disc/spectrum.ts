import { DISC_TRAITS, type DiscTrait } from "@/lib/disc/questions";

/**
 * Segment widths for the stacked DISC spectrum, as percentages of the bar.
 *
 * `score.ts` rounds each trait independently, so the four can sum to 99 or
 * 101 — invisible in four separate bars, visible in one stacked one. The last
 * segment absorbs the remainder so the bar always closes at 100%; the
 * *printed* percentages stay exactly what scoring produced.
 *
 * Lives here rather than in the result screen because the share card
 * (Plan 23) draws the same bar on a canvas and has to close it the same way —
 * a card whose segments didn't match the page it came from would be a bug
 * nobody would think to look for.
 */
export function spectrumWidths(
  percentages: Record<DiscTrait, number>,
): Record<DiscTrait, number> {
  const widths = {} as Record<DiscTrait, number>;
  let used = 0;
  DISC_TRAITS.forEach((trait, index) => {
    if (index === DISC_TRAITS.length - 1) {
      widths[trait] = Math.max(0, 100 - used);
      return;
    }
    widths[trait] = percentages[trait];
    used += percentages[trait];
  });
  return widths;
}
