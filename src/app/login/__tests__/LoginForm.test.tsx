import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { signInWithGoogle } = vi.hoisted(() => ({ signInWithGoogle: vi.fn() }));

vi.mock("@/lib/auth-browser", () => ({ signInWithGoogle }));

import LoginForm from "../LoginForm";

beforeEach(() => {
  vi.clearAllMocks();
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
});
