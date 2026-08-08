import { DISC_TRAITS, type DiscTrait } from "@/lib/disc/questions";
import { spectrumWidths } from "@/lib/disc/spectrum";

/**
 * The 9:16 DISC result card (Plan 23), drawn straight onto a canvas.
 *
 * Client-side canvas rather than a dynamic OG-image route (decided
 * 2026-08-07): the other option needs the result encoded in a URL, which puts
 * a personality result in a shareable, loggable link. Here the result never
 * leaves the device — the page draws it, hands over a blob, and forgets it.
 *
 * The cost of that choice is this file: the layout is written out instead of
 * inherited from the DOM. It's kept honest by deriving every number from the
 * mockup's 320px-wide frame in spec-disc-redesign.html, at one scale factor —
 * so a change there maps to a change here without re-guessing proportions.
 */

/** WhatsApp-status sized: 1080×1920 is 9:16 exactly. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** The mockup frame these numbers were measured on. */
const MOCKUP_WIDTH = 320;
const S = CARD_WIDTH / MOCKUP_WIDTH; // 3.375

const PAD_X = 24 * S;
const PAD_Y = 26 * S;
const CONTENT_WIDTH = CARD_WIDTH - PAD_X * 2;

/**
 * The mockup's own proportions leave roughly a third of the card empty
 * between the wordmark and the kicker — unremarkable in a 320px frame, a
 * conspicuous void at 1920. Everything below the wordmark is drawn a quarter
 * larger, which closes most of that band and makes the card easier to read at
 * status size; the frame margins stay exactly where the mockup put them.
 *
 * Growing the block is the fix rather than moving it up: the layout is
 * bottom-anchored, so translating it would only shift the same void beneath
 * the footer, where it would read as a mistake instead of as breathing room.
 */
const CONTENT_SCALE = 1.25;
const C = S * CONTENT_SCALE;

// Brand tokens, copied from globals.css. Canvas can't read CSS custom
// properties, so these are the one place in the app where the palette is
// duplicated — hex values, named, so a mismatch is greppable.
const NAVY_800 = "#14346f";
const NAVY_700 = "#183f87";
const NAVY_600 = "#2b4e91";
const NAVY_300 = "#9eaecd";
const NAVY_200 = "#c3cde0";
const RED_500 = "#f04975";
const RED_400 = "#f5809e";
const YELLOW_400 = "#f5ba01";
const SUCCESS_500 = "#22c55e";
const WHITE = "#ffffff";
const RULE = "rgba(255, 255, 255, 0.16)";

/**
 * Trait fills for the card. Three match `TRAIT_META` exactly; **C does not**.
 * On screen C is brand-navy-700, which is also this card's background — the
 * dominant segment of every C-heavy profile would vanish. On the dark ground
 * it renders as brand-navy-300, the same substitution the mockup's legend
 * made.
 */
const TRAIT_FILL: Record<DiscTrait, string> = {
  D: RED_500,
  I: YELLOW_400,
  S: SUCCESS_500,
  C: NAVY_300,
};

/** Non-dominant segments and their swatches, matching the mockup's .45. */
const DIM = 0.45;

/** Every weight the card asks for, so they can be preloaded before drawing. */
export const CARD_FONT_WEIGHTS = [400, 600, 700, 800] as const;

/** A QR code as a square matrix of dark/light modules. */
export type QrMatrix = readonly (readonly boolean[])[];

export type ShareCardData = {
  /** Profile name, e.g. "Sang Penata". Wraps to two lines when it must. */
  title: string;
  /** Trait mix in words, e.g. "Steadiness + Conscientiousness". */
  blend: string;
  percentages: Record<DiscTrait, number>;
  dominant: readonly DiscTrait[];
  /** What the QR encodes: the test link, carrying `?ref=` when there is one. */
  qrMatrix: QrMatrix;
  /**
   * Printed under the wordmark as identity, not instruction (revised
   * 2026-08-08 — see the plan doc) — the landing page, host only, no scheme.
   */
  siteHost: string;
  /**
   * The leader a joiner should pick as "Pengundang / Unit" on `/join`, or
   * null when no referrer resolved. Printed in the footer, labelled just
   * "Unit", so someone who types the URL instead of scanning the QR still
   * lands in the right unit.
   */
  unitName: string | null;
  /** Resolved CSS font stack — canvas needs a real family name, not a var(). */
  fontFamily: string;
};

/* ------------------------------------------------------------------ */
/* Layout math (pure — tested on its own)                              */
/* ------------------------------------------------------------------ */

export type Segment = {
  trait: DiscTrait;
  x: number;
  width: number;
  dominant: boolean;
};

/**
 * The stacked spectrum in card pixels. Shares `spectrumWidths` with the
 * result screen, so the card's bar closes at exactly the same place the
 * page's does; the last segment is then snapped to the bar's right edge so
 * sub-pixel accumulation can't leave a hairline gap in an exported PNG.
 */
export function spectrumSegments(
  percentages: Record<DiscTrait, number>,
  dominant: readonly DiscTrait[],
  barWidth = CONTENT_WIDTH,
): Segment[] {
  const widths = spectrumWidths(percentages);
  let x = 0;
  return DISC_TRAITS.map((trait, index) => {
    const last = index === DISC_TRAITS.length - 1;
    const width = last ? barWidth - x : (widths[trait] / 100) * barWidth;
    const segment = {
      trait,
      x,
      width: Math.max(0, width),
      dominant: dominant.includes(trait),
    };
    x += width;
    return segment;
  });
}

/** `Sang Penata` → `disc-sang-penata.png`. */
export function shareCardFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `disc-${slug || "hasil"}.png`;
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

function setFont(
  ctx: Ctx,
  family: string,
  weight: number,
  size: number,
  tracking = 0,
): void {
  ctx.font = `${weight} ${size}px ${family}`;
  // Supported everywhere this card can be produced (Chrome 99+, Safari 17.4+)
  // and silently ignored where it isn't — tracking is a refinement, never
  // load-bearing for whether the text fits.
  ctx.letterSpacing = `${tracking}px`;
}

/**
 * Greedy word wrap against the current font. A word wider than `maxWidth` on
 * its own — the real case, not a hypothetical: a Vercel preview branch URL
 * printed under the wordmark — has no space to break on, so it's chopped at
 * the character level instead of being left to run off the card whole.
 */
function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = "";

  function place(word: string): void {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) {
      lines.push(line);
      line = "";
    }
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      return;
    }
    breakWord(word);
  }

  function breakWord(word: string): void {
    let chunk = "";
    for (const char of word) {
      const candidate = chunk + char;
      if (chunk && ctx.measureText(candidate).width > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = candidate;
      }
    }
    line = chunk;
  }

  words.forEach(place);
  if (line) lines.push(line);
  return lines;
}

/**
 * Shrinks the font until `text` fits `maxWidth`, down to `min`, leaves it set
 * on the context, and returns the size it settled on. Names and hostnames are
 * user data — a long unit name has to get smaller rather than run off the
 * card.
 */
function fitFont(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  family: string,
  weight: number,
  size: number,
  min: number,
): number {
  let current = size;
  setFont(ctx, family, weight, current);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 1;
    setFont(ctx, family, weight, current);
  }
  return current;
}

function roundRectPath(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

/**
 * CSS `linear-gradient(160deg, …)` as canvas coordinates. The gradient line
 * runs through the centre at 160° clockwise from "to top", and is long enough
 * that both corners perpendicular to it land inside the ramp.
 */
function brandGradient(ctx: Ctx): CanvasGradient {
  const angle = (160 * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const length =
    Math.abs(CARD_WIDTH * dx) + Math.abs(CARD_HEIGHT * dy);
  const cx = CARD_WIDTH / 2;
  const cy = CARD_HEIGHT / 2;

  const gradient = ctx.createLinearGradient(
    cx - (dx * length) / 2,
    cy - (dy * length) / 2,
    cx + (dx * length) / 2,
    cy + (dy * length) / 2,
  );
  gradient.addColorStop(0, NAVY_800);
  gradient.addColorStop(0.46, NAVY_700);
  gradient.addColorStop(1, NAVY_600);
  return gradient;
}

/* ------------------------------------------------------------------ */
/* The draw                                                            */
/* ------------------------------------------------------------------ */

const CAPTION = "Scan buat ikut tesnya";

const QR_SIZE = 300 * CONTENT_SCALE;
const QR_QUIET = 22 * CONTENT_SCALE;
const QR_GAP = 36 * CONTENT_SCALE;
const FOOTER_RULE_GAP = 16 * C;

/**
 * Draws the whole card into `ctx`, which must be sized `CARD_WIDTH ×
 * CARD_HEIGHT`. Synchronous by design: fonts are the caller's problem
 * (see `ShareCardButton`), because a half-loaded family has to be awaited
 * before the first `measureText`, not during the draw.
 *
 * Laid out bottom-up, mirroring the mockup's flex column with the wordmark
 * pushed to the top by `margin-bottom: auto` — the content block sits on the
 * bottom edge whatever height the title wraps to.
 */
export function drawShareCard(ctx: Ctx, data: ShareCardData): void {
  ctx.fillStyle = brandGradient(ctx);
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  drawWordmark(ctx, data);

  let bottom = CARD_HEIGHT - PAD_Y;
  bottom = drawFooter(ctx, data, bottom);
  bottom = drawLegend(ctx, data, bottom - 26 * C);
  bottom = drawSpectrum(ctx, data, bottom - 12 * C);
  bottom = drawBlend(ctx, data, bottom - 20 * C);
  bottom = drawTitle(ctx, data, bottom - 8 * C);
  drawKicker(ctx, data.fontFamily, bottom - 8 * C);
}

/**
 * The wordmark, plus — as of the 2026-08-08 revision — the site's own
 * address underneath it. The URL used to live in the footer, next to "Scan
 * buat ikut tesnya," where it read as a second way into the test; it isn't
 * one (it carries no `?ref=`, only the QR does). Under the wordmark it reads
 * as identity instead, the way a poster prints a brand's address, and the
 * footer is left holding exactly one call to action.
 */
function drawWordmark(ctx: Ctx, data: ShareCardData): void {
  const wordmarkSize = 14 * S;
  setFont(ctx, data.fontFamily, 800, wordmarkSize, -0.02 * wordmarkSize);
  const connect = "CONNECT";
  ctx.fillStyle = WHITE;
  ctx.fillText(connect, PAD_X, PAD_Y);
  ctx.fillStyle = RED_400;
  ctx.fillText("eam", PAD_X + ctx.measureText(connect).width, PAD_Y);

  // Shrink then wrap — the same two escape hatches the footer's unit name
  // gets. This is usually a short production domain, but a Vercel preview
  // branch URL can run to 70+ characters, and canvas text doesn't wrap or
  // clip itself: left with only a shrink floor it was still running straight
  // off the edge of the card.
  const hostSize = fitFont(
    ctx,
    data.siteHost,
    CONTENT_WIDTH,
    data.fontFamily,
    400,
    9.5 * C,
    8 * C,
  );
  const hostLines = wrapText(ctx, data.siteHost, CONTENT_WIDTH);
  ctx.fillStyle = NAVY_300;
  hostLines.forEach((line, index) => {
    ctx.fillText(line, PAD_X, PAD_Y + wordmarkSize * 1.2 + index * hostSize * 1.35);
  });
}

function drawKicker(ctx: Ctx, family: string, bottom: number): void {
  const size = 11.5 * C;
  setFont(ctx, family, 700, size, 0.12 * size);
  ctx.fillStyle = YELLOW_400;
  ctx.fillText("HASIL TES DISC", PAD_X, bottom - size * 1.2);
}

function drawTitle(ctx: Ctx, data: ShareCardData, bottom: number): number {
  const size = 40 * C;
  const lineHeight = size * 1.02;
  setFont(ctx, data.fontFamily, 700, size, -0.032 * size);

  const lines = wrapText(ctx, data.title, CONTENT_WIDTH);
  const top = bottom - lines.length * lineHeight;
  ctx.fillStyle = WHITE;
  lines.forEach((line, index) => {
    ctx.fillText(line, PAD_X, top + index * lineHeight);
  });
  return top;
}

function drawBlend(ctx: Ctx, data: ShareCardData, bottom: number): number {
  const size = 14 * C;
  const lineHeight = size * 1.35;
  setFont(ctx, data.fontFamily, 400, size);

  const lines = wrapText(ctx, data.blend, CONTENT_WIDTH);
  const top = bottom - lines.length * lineHeight;
  ctx.fillStyle = NAVY_200;
  lines.forEach((line, index) => {
    ctx.fillText(line, PAD_X, top + index * lineHeight);
  });
  return top;
}

function drawSpectrum(ctx: Ctx, data: ShareCardData, bottom: number): number {
  const height = 12 * C;
  const top = bottom - height;

  ctx.save();
  roundRectPath(ctx, PAD_X, top, CONTENT_WIDTH, height, height / 2);
  ctx.clip();
  for (const segment of spectrumSegments(data.percentages, data.dominant)) {
    ctx.globalAlpha = segment.dominant ? 1 : DIM;
    ctx.fillStyle = TRAIT_FILL[segment.trait];
    ctx.fillRect(PAD_X + segment.x, top, segment.width, height);
  }
  ctx.restore();

  return top;
}

/**
 * Four swatch-and-label pairs on one row. The row is the only place on the
 * card where four independent strings share a line, so its gap is fitted
 * rather than fixed: at `CONTENT_SCALE` the mockup's 14px gap no longer
 * leaves the four items room, and a legend that wrapped or ran off would be a
 * worse trade than one sitting slightly tighter.
 */
function drawLegend(ctx: Ctx, data: ShareCardData, bottom: number): number {
  const size = 12 * C;
  const swatch = 8 * C;
  const pad = 5 * C;
  const top = bottom - size * 1.2;

  setFont(ctx, data.fontFamily, 400, size);

  const labels = DISC_TRAITS.map(
    (trait) => `${trait} ${data.percentages[trait]}%`,
  );
  const items = labels.reduce(
    (sum, label) => sum + swatch + pad + ctx.measureText(label).width,
    0,
  );
  const gap = Math.max(
    6 * C,
    Math.min(14 * C, (CONTENT_WIDTH - items) / (labels.length - 1)),
  );

  let x = PAD_X;
  DISC_TRAITS.forEach((trait, index) => {
    const label = labels[index];

    // Full strength, unlike the bar: the legend is the key, and a swatch
    // dimmer than the segment it names is just harder to match up. Dominance
    // is the bar's job to show.
    ctx.fillStyle = TRAIT_FILL[trait];
    roundRectPath(ctx, x, top + (size * 1.2 - swatch) / 2, swatch, swatch, 2 * C);
    ctx.fill();

    ctx.fillStyle = NAVY_200;
    ctx.fillText(label, x + swatch + pad, top);
    x += swatch + pad + ctx.measureText(label).width + gap;
  });

  return top;
}

/**
 * The referral surface's one job: get someone to scan. The site's own
 * address moved under the wordmark (2026-08-08 revision — it was reading as
 * a second way into the test, sitting right here), so what's left is the QR,
 * the "scan" caption, and the unit to name if the visitor follows up on
 * `/join` instead of scanning.
 */
function drawFooter(ctx: Ctx, data: ShareCardData, bottom: number): number {
  const qrTop = bottom - QR_SIZE;

  drawQr(ctx, data.qrMatrix, PAD_X, qrTop, QR_SIZE);

  const textX = PAD_X + QR_SIZE + QR_GAP;
  const textWidth = CARD_WIDTH - PAD_X - textX;

  const captionSize = 13 * C;
  const labelSize = 9 * C;
  const unitSize = 12.5 * C;
  const blockGap = 8 * C;

  // The unit is a person's name, so it gets both escape hatches: shrink to a
  // floor, then wrap what's still too wide. Every real leader name fits on one
  // line at full size — this is for the one that doesn't.
  let unitLines: string[] = [];
  let unitFitted = unitSize;
  if (data.unitName) {
    unitFitted = fitFont(
      ctx,
      data.unitName,
      textWidth,
      data.fontFamily,
      600,
      unitSize,
      9 * C,
    );
    unitLines = wrapText(ctx, data.unitName, textWidth);
  }

  // Fixed copy, but the column narrowed when the QR grew — fitted like the
  // rest rather than left to run past the card edge.
  const captionFitted = fitFont(
    ctx,
    CAPTION,
    textWidth,
    data.fontFamily,
    600,
    captionSize,
    9 * C,
  );

  const rows =
    captionFitted * 1.35 +
    (unitLines.length
      ? blockGap + labelSize * 1.4 + unitLines.length * unitFitted * 1.35
      : 0);

  let y = qrTop + (QR_SIZE - rows) / 2;

  setFont(ctx, data.fontFamily, 600, captionFitted);
  ctx.fillStyle = WHITE;
  ctx.fillText(CAPTION, textX, y);
  y += captionFitted * 1.35;

  if (unitLines.length) {
    y += blockGap;
    setFont(ctx, data.fontFamily, 700, labelSize, 0.1 * labelSize);
    ctx.fillStyle = NAVY_300;
    // Shortened from "Pengundang / Unit" (2026-08-08): the footer already
    // reads as belonging to the DISC test, so the full /join field name was
    // redundant here, and it was the only string competing with the caption
    // once the URL moved out.
    ctx.fillText("UNIT", textX, y);
    y += labelSize * 1.4;

    setFont(ctx, data.fontFamily, 600, unitFitted);
    ctx.fillStyle = WHITE;
    unitLines.forEach((line, index) => {
      ctx.fillText(line, textX, y + index * unitFitted * 1.35);
    });
  }

  const ruleY = qrTop - FOOTER_RULE_GAP;
  ctx.fillStyle = RULE;
  ctx.fillRect(PAD_X, ruleY, CONTENT_WIDTH, 2);

  return ruleY;
}

/**
 * Modules drawn as plain rects on a white plate. The plate is deliberately
 * bigger than the matrix: the quiet zone is part of the spec, and a QR sitting
 * flush against a navy background doesn't scan.
 */
function drawQr(
  ctx: Ctx,
  matrix: QrMatrix,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillStyle = WHITE;
  roundRectPath(ctx, x, y, size, size, 6 * C);
  ctx.fill();

  const count = matrix.length;
  if (count === 0) return;

  // Snapped to whole pixels: a fractional module size smears every edge in the
  // export, which is exactly what a scanner is least tolerant of.
  const cell = Math.max(1, Math.floor((size - QR_QUIET * 2) / count));
  const drawn = cell * count;
  const originX = x + (size - drawn) / 2;
  const originY = y + (size - drawn) / 2;

  ctx.fillStyle = "#000000";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!matrix[row][col]) continue;
      ctx.fillRect(originX + col * cell, originY + row * cell, cell, cell);
    }
  }
}
