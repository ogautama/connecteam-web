import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser }));

import Home from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(null);
});

describe("Home page", () => {
  test("renders all major sections", async () => {
    render(await Home());

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

  // Both tool teasers are hidden (src/lib/features.ts): DISC is shipped but
  // unlisted by choice since 2026-08-06 — prospects reach it via referral
  // links (Plan 16), not the home page — and the calculator isn't built yet
  // (Plan 05). Update this when either flag flips.
  test("links to neither the unlisted DISC test nor the unbuilt calculator", async () => {
    render(await Home());
    expect(
      screen.queryByRole("link", { name: /Mulai Tes DISC/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Hitung Potensi Income/i }),
    ).not.toBeInTheDocument();
  });
});
