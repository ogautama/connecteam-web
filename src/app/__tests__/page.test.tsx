import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../page";

describe("Home page", () => {
  test("renders all major sections", () => {
    render(<Home />);

    // Hero
    expect(
      screen.getByRole("heading", { level: 1, name: /Kerja Gak Harus/i }),
    ).toBeInTheDocument();
    // Value pillars
    expect(
      screen.getByRole("heading", { name: /Kenapa Gabung CONNECTeam/i }),
    ).toBeInTheDocument();
    // Vision
    expect(screen.getByRole("heading", { name: /Visi Kami/i })).toBeInTheDocument();
    // Challenge / CTA + join links
    expect(
      screen.getByRole("heading", { name: /Siap ambil langkah pertama/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Gabung Sekarang/i }).length,
    ).toBeGreaterThan(0);
  });

  // DISC shipped in Plan 04, so its teaser is live now. The calculator stays
  // gated off (src/lib/features.ts) until Plan 05 — update this when that flag
  // flips, so a staging build never has dead links.
  test("links to the DISC test and not the unbuilt calculator", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", { name: /Mulai Tes DISC/i }),
    ).toHaveAttribute("href", "/tools/disc");
    expect(
      screen.queryByRole("link", { name: /Hitung Potensi Income/i }),
    ).not.toBeInTheDocument();
  });
});
