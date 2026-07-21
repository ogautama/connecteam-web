import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../page";

describe("Home page", () => {
  test("renders all major sections", () => {
    render(<Home />);

    // Hero
    expect(
      screen.getByRole("heading", { level: 1, name: /Kerja Ngak Harus/i }),
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

  // Tool links are gated off until Plans 04/05 ship (src/lib/features.ts) so a
  // staging build has no dead links. Update these when the flags flip.
  test("does not link to the unbuilt tool pages while gated", () => {
    render(<Home />);
    expect(
      screen.queryByRole("link", { name: /Mulai Tes DISC/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Hitung Potensi Income/i }),
    ).not.toBeInTheDocument();
  });
});
