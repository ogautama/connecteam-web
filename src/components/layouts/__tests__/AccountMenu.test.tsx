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

  test("truncates a long name below sm instead of squeezing the header", () => {
    render(<AccountMenu name="Christantus Alexander Situmorang" role="agent" />);

    const nameSpan = screen.getByText("Christantus Alexander Situmorang");
    expect(nameSpan).toHaveClass("truncate", "max-w-[6.5rem]", "sm:max-w-none");
  });

  test("links to the member space", () => {
    render(<AccountMenu name="Rani Putri" role="agent" />);

    fireEvent.click(screen.getByRole("button", { name: /Rani Putri/ }));

    expect(screen.getByRole("menuitem", { name: "Member Space" })).toHaveAttribute(
      "href",
      "/member",
    );
  });

  test('"Profile" opens the Profile page — its entry point since it left the checklist', () => {
    render(<AccountMenu name="Rani Putri" role="agent" />);

    fireEvent.click(screen.getByRole("button", { name: /Rani Putri/ }));

    // Label, page and route all say "Profile" as of the 2026-08-06 route
    // rename; the old /member/isi-data path 308s here (next.config.ts).
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/member/profile",
    );
  });

  test("Profile sits above Member Space in the menu", () => {
    render(<AccountMenu name="Rani Putri" role="agent" />);

    fireEvent.click(screen.getByRole("button", { name: /Rani Putri/ }));

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Profile",
      "Member Space",
      "Log out",
    ]);
  });

  test("logging out clears the session and returns to the home page", async () => {
    render(<AccountMenu name="Rani Putri" role="leader" />);

    fireEvent.click(screen.getByRole("button", { name: /Rani Putri/ }));
    expect(screen.getByRole("menu")).toHaveTextContent("Leader");

    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalledOnce();
  });
});
