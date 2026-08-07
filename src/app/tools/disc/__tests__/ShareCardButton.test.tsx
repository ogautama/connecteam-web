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
});

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

  test("hands the file to the native share sheet when one accepts files", async () => {
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

  test("a dismissed share sheet is not an error", async () => {
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
