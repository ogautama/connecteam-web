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
 * over: the native share sheet where the browser has one with file support
 * (which is where this is used — a phone, on the way to a WhatsApp status),
 * a plain download everywhere else, and the download again if the share
 * sheet was offered but failed for any reason other than the visitor
 * cancelling it (`deliver`) — `navigator.share()` has to run inside the
 * click's transient activation window, and the QR/font prep ahead of it can
 * eat into that on a slow connection.
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

async function deliver(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: "image/png" });

  // `canShare` with the actual file, not just `navigator.share` — desktop
  // Chrome has a share sheet that refuses files, and calling it would throw
  // after the visitor already picked a target.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // A dismissed share sheet is the user changing their mind — leave it
      // there, don't force a download on them. Any other failure falls
      // through to the download below instead of leaving the visitor with
      // nothing: `share()` needs to run inside the click's transient
      // activation window, and `renderCard` awaits a dynamic import and
      // font loading first — on a slow connection that's enough for the
      // window to close and `share()` to reject for a reason that has
      // nothing to do with whether a download would still work fine.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked a tick later: revoking synchronously races the download starting.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
