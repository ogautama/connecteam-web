import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireMember } = vi.hoisted(() => ({ requireMember: vi.fn() }));

vi.mock("@/lib/auth", () => ({ requireMember }));

// Client-side hooks used by the shell's nav/account menu.
vi.mock("next/navigation", () => ({
  usePathname: () => "/member",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import MemberSpaceLayout from "../layout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/member layout", () => {
  test("wraps the page in the member shell for an authenticated agent", async () => {
    requireMember.mockResolvedValue({
      id: "user_1",
      name: "Rani Putri",
      role: "agent",
    });

    render(await MemberSpaceLayout({ children: <p>Dashboard content</p> }));

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Member" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Rani Putri/ }),
    ).toBeInTheDocument();
  });

  test("renders nothing itself when the guard redirects", async () => {
    // requireMember calls next/navigation's redirect(), which throws — the
    // layout must not swallow it (see auth.test.ts for the targets).
    requireMember.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(MemberSpaceLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});
