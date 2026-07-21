import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { signInWithGoogle, get } = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/lib/auth-browser", () => ({ signInWithGoogle }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get }),
}));

import LoginForm from "../LoginForm";

beforeEach(() => {
  vi.clearAllMocks();
  get.mockReturnValue(null);
});

describe("LoginForm", () => {
  it("renders the Sign in with Google button", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /Sign in with Google/i }),
    ).toBeInTheDocument();
  });

  it("calls signInWithGoogle() when the button is clicked", () => {
    render(<LoginForm />);
    fireEvent.click(
      screen.getByRole("button", { name: /Sign in with Google/i }),
    );
    expect(signInWithGoogle).toHaveBeenCalledOnce();
  });

  it("does not show the not-invited notice by default", () => {
    render(<LoginForm />);
    expect(screen.queryByText(/belum ditambahkan/i)).not.toBeInTheDocument();
  });

  it("shows the not-invited notice when redirected back with ?reason=not-invited", () => {
    get.mockImplementation((key: string) =>
      key === "reason" ? "not-invited" : null,
    );

    render(<LoginForm />);
    expect(screen.getByText(/belum ditambahkan/i)).toBeInTheDocument();
    // The sign-in button is still available to retry.
    expect(
      screen.getByRole("button", { name: /Sign in with Google/i }),
    ).toBeInTheDocument();
  });
});
