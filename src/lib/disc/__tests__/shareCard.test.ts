import { describe, expect, test } from "vitest";

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  drawShareCard,
  shareCardFileName,
  spectrumSegments,
  type ShareCardData,
} from "@/lib/disc/shareCard";
import { DISC_QUESTIONS, DISC_TRAITS } from "@/lib/disc/questions";
import { scoreDisc } from "@/lib/disc/score";

/* ------------------------------------------------------------------ */
/* A recording 2d context                                              */
/* ------------------------------------------------------------------ */

type Call = { op: string; args: unknown[]; font?: string };

/**
 * jsdom has no canvas, and the point of testing the draw isn't the pixels —
 * it's that nothing runs off the card and every string that should reach it
 * does. `measureText` bills each character at 0.55em, which is close enough to
 * a real sans face for the wrap and fit-to-width paths to behave.
 */
function recordingContext() {
  const calls: Call[] = [];
  const state = { font: "", letterSpacing: "0px", fillStyle: "" as unknown };

  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args });
    };

  const ctx = {
    get font() {
      return state.font;
    },
    set font(value: string) {
      state.font = value;
    },
    letterSpacing: "0px",
    textBaseline: "top",
    textAlign: "left",
    globalAlpha: 1,
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: unknown) {
      state.fillStyle = value;
    },
    fillRect: record("fillRect"),
    rect: record("rect"),
    roundRect: record("roundRect"),
    beginPath: record("beginPath"),
    fill: record("fill"),
    clip: record("clip"),
    save: record("save"),
    restore: record("restore"),
    fillText: (text: string, x: number, y: number) => {
      calls.push({ op: "fillText", args: [text, x, y], font: state.font });
    },
    measureText: (text: string) => {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1] ?? 16);
      return { width: text.length * size * 0.55 } as TextMetrics;
    },
    createLinearGradient: (...args: number[]) => {
      calls.push({ op: "createLinearGradient", args });
      return { addColorStop: record("addColorStop") };
    },
  };

  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

/** Every `fillText` the draw made, in order. */
function texts(calls: Call[]): string[] {
  return calls.filter((c) => c.op === "fillText").map((c) => c.args[0] as string);
}

/** A solid 21×21 QR stand-in — the encoder is the library's problem. */
const QR: boolean[][] = Array.from({ length: 21 }, (_, row) =>
  Array.from({ length: 21 }, (_, col) => (row + col) % 2 === 0),
);

function cardData(overrides: Partial<ShareCardData> = {}): ShareCardData {
  const result = scoreDisc(DISC_QUESTIONS.map(() => "S"));
  return {
    title: "Sang Penata",
    blend: "Steadiness + Conscientiousness",
    percentages: result.percentages,
    dominant: result.dominant,
    qrMatrix: QR,
    siteHost: "connecteam-web.vercel.app",
    unitName: "Robert Hartono",
    fontFamily: "TestSans, sans-serif",
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */

describe("spectrumSegments", () => {
  test("tiles the bar edge to edge with no gap and no overhang", () => {
    const segments = spectrumSegments({ D: 21, I: 13, S: 33, C: 34 }, ["S"], 900);

    expect(segments[0].x).toBe(0);
    const last = segments[segments.length - 1];
    expect(last.x + last.width).toBeCloseTo(900, 6);

    // Each segment starts exactly where the previous one ended.
    segments.slice(1).forEach((segment, index) => {
      const previous = segments[index];
      expect(segment.x).toBeCloseTo(previous.x + previous.width, 6);
    });
  });

  test("the last segment absorbs the rounding, like the on-screen bar", () => {
    // These four percentages sum to 101; C has to give a point back.
    const segments = spectrumSegments({ D: 21, I: 13, S: 33, C: 34 }, ["S"], 100);

    expect(segments.map((s) => s.trait)).toEqual([...DISC_TRAITS]);
    expect(segments[3].width).toBeCloseTo(33, 6);
  });

  test("marks exactly the dominant traits", () => {
    const segments = spectrumSegments(
      { D: 40, I: 10, S: 10, C: 40 },
      ["D", "C"],
    );

    expect(segments.filter((s) => s.dominant).map((s) => s.trait)).toEqual([
      "D",
      "C",
    ]);
  });

  test("never goes negative when the rounding overshoots the bar", () => {
    const segments = spectrumSegments({ D: 34, I: 34, S: 34, C: 0 }, ["D"], 900);

    expect(segments[3].width).toBe(0);
  });
});

describe("shareCardFileName", () => {
  test("slugs the profile title", () => {
    expect(shareCardFileName("Sang Penata")).toBe("disc-sang-penata.png");
    expect(shareCardFileName("Sang Ahli Strategi")).toBe(
      "disc-sang-ahli-strategi.png",
    );
  });

  test("falls back rather than producing a bare extension", () => {
    expect(shareCardFileName("···")).toBe("disc-hasil.png");
  });
});

describe("drawShareCard", () => {
  test("fills the whole 9:16 frame before anything else", () => {
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData());

    expect(calls[0].op).toBe("createLinearGradient");
    expect(calls.find((c) => c.op === "fillRect")?.args).toEqual([
      0,
      0,
      CARD_WIDTH,
      CARD_HEIGHT,
    ]);
  });

  test("writes the wordmark, kicker, profile, blend and legend", () => {
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData());
    const written = texts(calls);

    expect(written).toContain("CONNECT");
    expect(written).toContain("eam");
    expect(written).toContain("HASIL TES DISC");
    // The title wraps to fit, so it's the joined text that has to carry it.
    expect(written.join(" ")).toContain("Sang Penata");
    expect(written.join(" ")).toContain("Steadiness + Conscientiousness");
    DISC_TRAITS.forEach((trait) => {
      expect(written.some((t) => t.startsWith(`${trait} `))).toBe(true);
    });
  });

  test("prints the site's own address under the wordmark, not the footer", () => {
    // Revised 2026-08-08: the URL used to sit next to "Scan buat ikut
    // tesnya," where it read as a second way into the test. It moved under
    // the wordmark — drawn first, so it lands before every footer string.
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData());
    const fillTexts = calls.filter((c) => c.op === "fillText");

    const hostIndex = fillTexts.findIndex(
      (c) => c.args[0] === "connecteam-web.vercel.app",
    );
    const captionIndex = fillTexts.findIndex(
      (c) => c.args[0] === "Scan buat ikut tesnya",
    );
    expect(hostIndex).toBeGreaterThan(-1);
    expect(hostIndex).toBeLessThan(captionIndex);
  });

  test("shrinks then wraps a long host instead of running it off the card", () => {
    // The real bug report: a Vercel preview branch URL
    // ("connecteam-web-git-plan-23-disc-…-projects.vercel.app") ran straight
    // off the right edge — the shrink floor alone wasn't enough, and unlike
    // the unit name below, there was no wrap fallback at all.
    const short = "connecteam.id";
    const long =
      "connecteam-web-git-plan-23-disc-share-card-ogautama-3223s-projects.vercel.app";

    const drawn = (siteHost: string) => {
      const { ctx, calls } = recordingContext();
      drawShareCard(ctx, cardData({ siteHost }));
      const fillTexts = calls.filter((c) => c.op === "fillText");
      // A URL has no spaces to break on, so a wrapped line is a raw
      // substring chunk rather than a whole "word" — matching on content
      // would false-hit "eam" from the wordmark, itself a substring of
      // "connecteam.id". The host block is everything drawn between the
      // wordmark and the footer's caption (drawn right after it, per the
      // card's bottom-up layout), which is unambiguous regardless of how
      // many lines the host wrapped to.
      const start = fillTexts.findIndex((c) => c.args[0] === "eam") + 1;
      const end = fillTexts.findIndex((c) => c.args[0] === "Scan buat ikut tesnya");
      return fillTexts.slice(start, end).map((c) => {
          const [text, x] = c.args as [string, number, number];
          const size = Number(/(\d+(?:\.\d+)?)px/.exec(c.font ?? "")![1]);
          return { text, size, right: x + text.length * size * 0.55 };
        });
    };

    const brief = drawn(short);
    const wordy = drawn(long);

    expect(brief).toHaveLength(1);
    expect(wordy.length).toBeGreaterThan(1);
    wordy.forEach((line) => expect(line.right).toBeLessThanOrEqual(CARD_WIDTH));
    expect(wordy.map((l) => l.text).join("")).toBe(long);
  });

  test("carries the referral footer: caption and unit, labelled just \"Unit\"", () => {
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData());
    const written = texts(calls);

    expect(written).toContain("Scan buat ikut tesnya");
    expect(written).toContain("UNIT");
    expect(written).toContain("Robert Hartono");
    // Shortened from "Pengundang / Unit" — the full /join field name was
    // redundant once the footer held nothing but referral content.
    expect(written).not.toContain("Pengundang / Unit");
  });

  test("drops the unit block when no referrer resolved", () => {
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData({ unitName: null }));
    const written = texts(calls);

    expect(written).toContain("connecteam-web.vercel.app");
    expect(written).not.toContain("UNIT");
  });

  test("never prints the invite code — the QR is what carries it", () => {
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData());

    expect(texts(calls).join(" ")).not.toContain("ref=");
  });

  test("every profile title and blend stays inside the card", () => {
    // Titles wrap; the point is that no single drawn line starts before the
    // padding or runs past the opposite edge.
    for (const title of [
      "Sang Penggerak",
      "Sang Ahli Strategi",
      "Sang Penata",
      "Sang Pendobrak",
    ]) {
      const { ctx, calls } = recordingContext();
      drawShareCard(ctx, cardData({ title }));

      for (const call of calls.filter((c) => c.op === "fillText")) {
        const [, x, y] = call.args as [string, number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(CARD_WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(CARD_HEIGHT);
      }
    }
  });

  test("shrinks then wraps a long unit name instead of running it off", () => {
    const short = "Robert";
    const long = "Bartholomew Kusumaningrat Wicaksono";

    /** Every line drawn for `unitName`, with the size it was drawn at. */
    const drawn = (unitName: string) => {
      const { ctx, calls } = recordingContext();
      drawShareCard(ctx, cardData({ unitName }));
      const words = new Set(unitName.split(" "));
      return calls
        .filter(
          (c) =>
            c.op === "fillText" &&
            String(c.args[0])
              .split(" ")
              .every((word) => words.has(word)),
        )
        .map((c) => {
          const [text, x] = c.args as [string, number, number];
          const size = Number(/(\d+(?:\.\d+)?)px/.exec(c.font ?? "")![1]);
          return { text, size, right: x + text.length * size * 0.55 };
        });
    };

    const brief = drawn(short);
    const wordy = drawn(long);

    expect(brief).toHaveLength(1);
    expect(wordy.length).toBeGreaterThan(1);
    expect(wordy[0].size).toBeLessThan(brief[0].size);
    // Both escape hatches together have to keep every line on the card.
    wordy.forEach((line) => expect(line.right).toBeLessThanOrEqual(CARD_WIDTH));
    // And the whole name still gets printed.
    expect(wordy.map((l) => l.text).join(" ")).toBe(long);
  });

  test("draws the QR plate and its dark modules", () => {
    const { ctx, calls } = recordingContext();
    drawShareCard(ctx, cardData());

    const dark = QR.flat().filter(Boolean).length;
    // Plate + spectrum fills + rule + background, then one rect per dark module.
    const rects = calls.filter((c) => c.op === "fillRect").length;
    expect(rects).toBeGreaterThanOrEqual(dark);
  });
});
