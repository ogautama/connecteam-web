import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountMenu, { initialOf } from "../AccountMenu";

const { push, refresh, signOut } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/auth-browser", () => ({ signOut }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initialOf", () => {
  test("takes the first letter, uppercased", () => {
    expect(initialOf("rani putri")).toBe("R");
  });

  test("falls back to ? for an empty name", () => {
    expect(initialOf("  ")).toBe("?");
  });
});

describe("AccountMenu", () => {
  test("shows the signed-in user's name, menu closed", () => {
    render(<AccountMenu name="Rani Putri" role="agent" />);

    expect(
      screen.getByRole("button", { name: /Rani Putri/ }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("logging out clears the session and returns to the home page", async () => {
    render(<AccountMenu name="Rani Putri" role="leader" />);

    fireEvent.click(screen.getByRole("button", { name: /Rani Putri/ }));
    expect(screen.getByRole("menu")).toHaveTextContent("Leader");

    fireEvent.click(screen.getByRole("menuitem", { name: "Keluar" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalledOnce();
  });
});
