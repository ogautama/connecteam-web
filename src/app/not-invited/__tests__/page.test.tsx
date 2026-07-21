import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
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

    expect(
      screen.getByRole("link", { name: /Kembali ke Beranda/i }),
    ).toHaveAttribute("href", "/");
  });
});
