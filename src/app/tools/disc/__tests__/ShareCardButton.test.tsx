import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { addData } = vi.hoisted(() => ({ addData: vi.fn() }));

// The encoder itself is the library's business; what matters here is the URL
// it's handed, because that is the card's entire referral mechanism.
vi.mock("qrcode-generator", () => ({
  default: () => ({
    addData,
    make: vi.fn(),
    getModuleCount: () => 21,
    isDark: (row: number, col: number) => (row + col) % 2 === 0,
  }),
}));

import ShareCardButton from "../ShareCardButton";
import { DISC_QUESTIONS } from "@/lib/disc/questions";
import { scoreDisc } from "@/lib/disc/score";

const result = scoreDisc(DISC_QUESTIONS.map(() => "S"));

/* ------------------------------------------------------------------ */
/* Canvas stubs                                                        */
/* ------------------------------------------------------------------ */

// jsdom ships no canvas implementation at all, so the whole surface the draw
// touches is stubbed. This suite is about the wiring — that a click produces a
// blob and hands it to the right place — not about pixels; the drawing itself
// is covered in lib/disc/__tests__/shareCard.test.ts.
function stubContext() {
  const noop = () => {};
  return {
    font: "",
    letterSpacing: "0px",
    textBaseline: "top",
    textAlign: "left",
    globalAlpha: 1,
    fillStyle: "",
    fillRect: noop,
    rect: noop,
    roundRect: noop,
    beginPath: noop,
    fill: noop,
    clip: noop,
    save: noop,
    restore: noop,
    fillText: noop,
    measureText: (text: string) => ({ width: text.length * 8 }),
    createLinearGradient: () => ({ addColorStop: noop }),
  };
}

const blob = new Blob(["png"], { type: "image/png" });
let toBlob: ReturnType<typeof vi.fn>;
let getContext: ReturnType<typeof vi.fn>;

beforeEach(() => {
  toBlob = vi.fn((callback: (b: Blob | null) => void) => callback(blob));
  getContext = vi.fn(() => stubContext());

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    getContext as unknown as HTMLCanvasElement["getContext"],
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    toBlob as unknown as HTMLCanvasElement["toBlob"],
  );

  // jsdom has neither, and both are only ever reached on the download path.
  URL.createObjectURL = vi.fn(() => "blob:card");
  URL.revokeObjectURL = vi.fn();

  // Fonts: present in jsdom's Document type but not implemented.
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { load: vi.fn().mockResolvedValue([]) },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "canShare");
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(window, "matchMedia");
});

/**
 * jsdom implements neither the media query nor the two Web Share methods —
 * every test that wants the share-sheet branch has to opt into all three, so
 * the default (nothing mocked) already exercises "no share sheet available"
 * on its own, matching plain desktop Chrome without any stubbing at all.
 */
function mockTouchDevice(coarse = true) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({ matches: coarse, media: query })),
  });
}

function renderButton(props: Partial<React.ComponentProps<typeof ShareCardButton>> = {}) {
  return render(
    <ShareCardButton
      result={result}
      title="Sang Penjaga"
      blend="Steadiness"
      unitName="Robert Hartono"
      {...props}
    />,
  );
}

/* ------------------------------------------------------------------ */

describe("ShareCardButton", () => {
  test("renders the card and downloads it when there's no share sheet", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() => expect(toBlob).toHaveBeenCalled());
    await waitFor(() => expect(click).toHaveBeenCalled());

    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("disc-sang-penjaga.png");
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  test("hands the file to the native share sheet on a touch-primary device", async () => {
    mockTouchDevice();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    const [{ files }] = share.mock.calls[0] as [{ files: File[] }];
    expect(files[0].name).toBe("disc-sang-penjaga.png");
    expect(files[0].type).toBe("image/png");
    // The download fallback must not also fire.
    expect(click).not.toHaveBeenCalled();
  });

  test("skips the share sheet on a mouse-driven device even if one exists", async () => {
    // This is the actual reported bug: a desktop share panel that never gets
    // acted on hangs `deliver()` until the timeout gives up on it, which
    // felt like the button "took minutes." Below that timeout, a
    // mouse/keyboard device shouldn't attempt it at all.
    mockTouchDevice(false);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(share).not.toHaveBeenCalled();
  });

  test("gives up on a share sheet that never settles, rather than hanging", async () => {
    vi.useFakeTimers();
    try {
      mockTouchDevice();
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: vi.fn(() => true),
      });
      // A share sheet left open: the promise just never resolves.
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: vi.fn(() => new Promise(() => {})),
      });
      const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      renderButton();
      fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

      // Nothing yet — still within the timeout budget.
      await vi.advanceTimersByTimeAsync(7000);
      expect(click).not.toHaveBeenCalled();

      // Past it: the download fallback takes over instead of leaving the
      // button stuck on "Menyiapkan gambar…" indefinitely.
      await vi.advanceTimersByTimeAsync(2000);
      expect(click).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test("the QR carries the test link on the referrer's code", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton({ refCode: "cku7abc" });
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() => expect(addData).toHaveBeenCalled());
    expect(addData).toHaveBeenCalledWith(
      `${window.location.origin}/tools/disc?ref=cku7abc`,
    );
  });

  test("without a referral code the QR is a plain test link", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() => expect(addData).toHaveBeenCalled());
    expect(addData).toHaveBeenCalledWith(
      `${window.location.origin}/tools/disc`,
    );
  });

  test("a dismissed share sheet is not an error, and doesn't fall back to a download", async () => {
    mockTouchDevice();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError")),
    });

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Simpan gambar hasilnya" })).toBeEnabled(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // The visitor cancelled on purpose — forcing a download afterwards would
    // be doing the opposite of what they just said.
    expect(click).not.toHaveBeenCalled();
  });

  test("any other share failure falls back to a download instead of giving up", async () => {
    // The most likely real cause: `share()` has to run inside the click's
    // transient activation window, and `renderCard` awaits a dynamic import
    // plus font loading first — on a slow connection that budget can run out
    // before `share()` is even called, and it rejects for a reason that has
    // nothing to do with whether a plain download would still work.
    mockTouchDevice();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi
        .fn()
        .mockRejectedValue(
          new DOMException("Must be handling a user gesture", "NotAllowedError"),
        ),
    });

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe("disc-sang-penjaga.png");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("a real failure says so instead of failing silently", async () => {
    toBlob.mockImplementation((callback: (b: Blob | null) => void) => callback(null));

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Simpan gambar hasilnya" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Gagal bikin gambarnya",
    );
  });

  test("takes its label from the caller, for the sent state's shorter one", () => {
    renderButton({ label: "Simpan gambar", variant: "inline" });

    expect(screen.getByRole("button", { name: "Simpan gambar" })).toBeInTheDocument();
  });
});
