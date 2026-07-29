import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireMember, getMemberIntake, getPengundangUnitOptions } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  getMemberIntake: vi.fn(),
  getPengundangUnitOptions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireMember }));
vi.mock("@/lib/memberIntake", async () => {
  const actual = await vi.importActual<typeof import("@/lib/memberIntake")>(
    "@/lib/memberIntake",
  );
  return { ...actual, getMemberIntake, getPengundangUnitOptions };
});

import IsiDataPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  requireMember.mockResolvedValue({
    id: "user_1",
    name: "Rani Putri",
    email: "rani@example.com",
    role: "agent",
  });
  getMemberIntake.mockResolvedValue(null);
  getPengundangUnitOptions.mockResolvedValue(["Robert / Lini", "Haryo / Daisy"]);
});

describe("isi-data page", () => {
  test("gates on membership before rendering", async () => {
    render(await IsiDataPage());

    expect(requireMember).toHaveBeenCalled();
    expect(getMemberIntake).toHaveBeenCalledWith("user_1");
  });

  test("never renders for a signed-out visitor — the guard redirects first", async () => {
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(IsiDataPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(getMemberIntake).not.toHaveBeenCalled();
  });

  test("shows the form with all required fields when nothing is saved yet", async () => {
    render(await IsiDataPage());

    expect(screen.getByRole("heading", { level: 1, name: "Isi Data" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nama Lengkap/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /No KTP/ })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pendidikan Terakhir" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Pengundang / Unit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Robert / Lini" })).toBeInTheDocument();
  });

  test("defaults the Email Aktif field to the signed-in member's email", async () => {
    render(await IsiDataPage());

    expect(screen.getByRole("textbox", { name: /Email Aktif/ })).toHaveValue(
      "rani@example.com",
    );
  });

  test("renders Pengundang / Unit options from the live leader list, not a fixed picklist", async () => {
    getPengundangUnitOptions.mockResolvedValue(["Zaki Firmansyah"]);

    render(await IsiDataPage());

    expect(getPengundangUnitOptions).toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Zaki Firmansyah" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Robert / Lini" })).not.toBeInTheDocument();
  });
});
