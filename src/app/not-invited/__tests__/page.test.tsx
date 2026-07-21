import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import NotInvitedPage from "../page";

describe("Not-invited page", () => {
  test("explains in Bahasa that sign-in worked but no invite exists", () => {
    render(<NotInvitedPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Kamu belum terdaftar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/berhasil masuk/i)).toBeInTheDocument();
    expect(screen.getByText(/leader/i)).toBeInTheDocument();
  });

  test("offers a way back to the home page", () => {
    render(<NotInvitedPage />);

    // "Home" in English, matching the marketing nav's label for the same
    // destination — nav labels stay English across the app. Scoped to <main>
    // so it's the page's own CTA, not the header nav link of the same name.
    const cta = within(screen.getByRole("main")).getByRole("link", {
      name: "Home",
    });
    expect(cta).toHaveAttribute("href", "/");
  });
});
