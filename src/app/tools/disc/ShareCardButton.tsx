"use client";

import { useState } from "react";
import type { DiscResult } from "@/lib/disc/score";
import {
  CARD_FONT_WEIGHTS,
  CARD_HEIGHT,
  CARD_WIDTH,
  drawShareCard,
  shareCardFileName,
  type QrMatrix,
} from "@/lib/disc/shareCard";

type Status = "idle" | "working" | "error";

/**
 * "Simpan gambar hasilnya" — produces the 9:16 card (Plan 23) and hands it
 * over: the native share sheet on a touch-primary device (a phone, on the
 * way to a WhatsApp status — the button's actual purpose), a plain download
 * everywhere else, and the download again if the share sheet was offered but
 * failed or simply never settled (`deliver`, `tryShare`) — its promise only
 * resolves once the visitor acts on it, so left alone it can hang
 * indefinitely on a panel nobody is looking at.
 *
 * Everything browser-shaped lives here so `lib/disc/shareCard` stays a
 * function of a canvas context: the QR encoder, font loading, `toBlob`, and
 * the share-vs-download fork.
 */
export default function ShareCardButton({
  result,
  title,
  blend,
  refCode,
  unitName,
  variant = "block",
  label = "Simpan gambar hasilnya",
}: {
  result: DiscResult;
  title: string;
  blend: string;
  /** The `?ref=` the visitor arrived on — baked into the QR, not the text. */
  refCode?: string;
  unitName: string | null;
  variant?: "block" | "inline";
  label?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    setStatus("working");
    try {
      const blob = await renderCard({ result, title, blend, refCode, unitName });
      await deliver(blob, shareCardFileName(title));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const inline = variant === "inline";

  return (
    <div className={inline ? "contents" : "flex flex-col gap-2"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "working"}
        className={
          inline
            ? "rounded-full border border-brand-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy-700 hover:bg-brand-navy-50 disabled:opacity-60"
            : "w-full rounded-full border border-brand-navy-200 bg-white px-6 py-3 text-sm font-semibold text-brand-navy-700 hover:bg-brand-navy-50 disabled:opacity-60"
        }
      >
        {status === "working" ? "Menyiapkan gambar…" : label}
      </button>
      {status === "error" && (
        <p role="alert" className="text-center text-xs text-danger-500">
          Gagal bikin gambarnya. Coba lagi ya.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

async function renderCard({
  result,
  title,
  blend,
  refCode,
  unitName,
}: {
  result: DiscResult;
  title: string;
  blend: string;
  refCode?: string;
  unitName: string | null;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("share card: no 2d context");

  const fontFamily = await resolveFont();

  drawShareCard(ctx, {
    title,
    blend,
    percentages: result.percentages,
    dominant: result.dominant,
    qrMatrix: await encodeQr(testUrl(refCode)),
    siteHost: landingHost(),
    unitName,
    fontFamily,
  });

  return toBlob(canvas);
}

/**
 * The link the QR carries: the test itself, still on the referrer's code, so a
 * stranger who scans a status lands exactly where the original visitor did and
 * the lead is attributed to the same member.
 */
function testUrl(refCode?: string): string {
  const url = new URL("/tools/disc", window.location.origin);
  if (refCode) url.searchParams.set("ref", refCode);
  return url.toString();
}

/**
 * The URL *printed* on the card is the landing page, host only — short enough
 * to be typed off a phone screen, and without the invite code, which has no
 * business being legible in an image a stranger can screenshot. The QR is what
 * carries attribution.
 */
function landingHost(): string {
  return window.location.host.replace(/^www\./, "");
}

/**
 * Geist is loaded by `next/font`, which mints a hashed family name — so the
 * stack is read off the document rather than hardcoded, then every weight the
 * card uses is awaited. Drawing before the load resolves silently measures and
 * paints the fallback face.
 */
async function resolveFont(): Promise<string> {
  const family =
    getComputedStyle(document.documentElement).fontFamily || "sans-serif";

  try {
    await Promise.all(
      CARD_FONT_WEIGHTS.map((weight) =>
        document.fonts.load(`${weight} 100px ${family}`),
      ),
    );
  } catch {
    // A font that won't preload still draws — in the fallback face, which is
    // a worse card, not a broken one.
  }

  return family;
}

/** Imported on click, not on page load: the encoder is ~50KB of the bundle
 * for a button most visitors never press. */
async function encodeQr(text: string): Promise<QrMatrix> {
  const { default: qrcode } = await import("qrcode-generator");

  // Type 0 picks the smallest version that fits; "M" is the usual trade for a
  // screen-displayed code — enough recovery for a photographed status, without
  // the extra modules that "H" would cost at this size.
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, col) => qr.isDark(row, col)),
  );
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("share card: toBlob returned null"));
    }, "image/png");
  });
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

// navigator.share()'s promise only resolves once the visitor acts on the
// native panel — leave it open and it hangs indefinitely, which is exactly
// what "the download takes minutes" turned out to be: not a slow
// computation, a promise waiting on a dialog nobody was looking at. Past
// this, give up on it and hand over the download instead; whatever the
// visitor does with the still-open panel afterwards is theirs to finish.
const SHARE_TIMEOUT_MS = 8000;

/**
 * Whether the share sheet is worth offering at all. It only serves this
 * button's actual purpose — a phone, on the way to a WhatsApp status — where
 * tapping it and picking a target is a two-second reflex. On a mouse-driven
 * desktop it's a native OS panel the visitor didn't ask for, frequently
 * without an obvious "save to disk" option in it, and it's what produced the
 * multi-minute hang: `pointer: coarse` is the standard signal for
 * touch-primary input, which tracks "phone or tablet" far better than
 * sniffing the user agent.
 */
function prefersShareSheet(): boolean {
  return (
    typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Resolves `true` when nothing more needs to happen — the share succeeded,
 * or the visitor explicitly cancelled it — and `false` when the download
 * fallback should run instead, which covers every other failure including a
 * share that simply never settled within `SHARE_TIMEOUT_MS`.
 */
async function tryShare(file: File): Promise<boolean> {
  try {
    await Promise.race([
      navigator.share({ files: [file] }),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new DOMException("share timed out", "TimeoutError")),
          SHARE_TIMEOUT_MS,
        );
      }),
    ]);
    return true;
  } catch (error) {
    // A dismissed share sheet is the user changing their mind — leave it
    // there, don't force a download on them. Every other failure (including
    // the timeout above, and `share()` rejecting because the click's
    // transient activation window closed while `renderCard` was still
    // awaiting the QR/font prep) falls through to the download.
    return error instanceof DOMException && error.name === "AbortError";
  }
}

async function deliver(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: "image/png" });

  // `canShare` with the actual file, not just `navigator.share` — desktop
  // Chrome has a share sheet that refuses files, and calling it would throw
  // after the visitor already picked a target.
  if (
    prefersShareSheet() &&
    navigator.canShare?.({ files: [file] }) &&
    (await tryShare(file))
  ) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked a tick later: revoking synchronously races the download starting.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
