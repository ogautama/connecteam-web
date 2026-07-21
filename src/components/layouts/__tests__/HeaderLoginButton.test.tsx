import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { signInWithGoogle } = vi.hoisted(() => ({ signInWithGoogle: vi.fn() }));

vi.mock("@/lib/auth-browser", () => ({ signInWithGoogle }));

import HeaderLoginButton from "../HeaderLoginButton";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HeaderLoginButton", () => {
  it("calls signInWithGoogle() directly on click (no /login navigation)", () => {
    render(<HeaderLoginButton />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(signInWithGoogle).toHaveBeenCalledOnce();
  });
});
