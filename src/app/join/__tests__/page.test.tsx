import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getCurrentUser, getPengundangUnitOptions } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPengundangUnitOptions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/memberIntake", async () => {
  const actual = await vi.importActual<typeof import("@/lib/memberIntake")>(
    "@/lib/memberIntake",
  );
  return { ...actual, getPengundangUnitOptions };
});

import JoinPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(null);
  getPengundangUnitOptions.mockResolvedValue(["Robert / Lini", "Haryo / Daisy"]);
});

describe("Join page", () => {
  test("renders the real application form, not the old Google Form embed", async () => {
    render(await JoinPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Gabung CONNECTeam" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pengundang / Unit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Robert / Lini" })).toBeInTheDocument();
    expect(screen.queryByTitle("Form pendaftaran CONNECTeam")).not.toBeInTheDocument();
  });

  test("works for a signed-out visitor — no member session required", async () => {
    render(await JoinPage());

    expect(getCurrentUser).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Kirim" })).toBeInTheDocument();
  });
});
