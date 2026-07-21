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
    // DISC teaser links to the tool
    expect(
      screen.getByRole("link", { name: /Mulai Tes DISC/i }),
    ).toHaveAttribute("href", "/tools/disc");
    // Challenge / CTA + join links
    expect(
      screen.getByRole("heading", { name: /Siap ambil langkah pertama/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Gabung Sekarang/i }).length,
    ).toBeGreaterThan(0);
  });
});
