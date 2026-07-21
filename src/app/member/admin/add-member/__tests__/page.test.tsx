import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireRole, listRecruiterOptions } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  listRecruiterOptions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRole }));
vi.mock("@/lib/invites", () => ({ listRecruiterOptions }));
vi.mock("../actions", () => ({ addMember: vi.fn() }));

import AddMemberPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  listRecruiterOptions.mockResolvedValue([
    { id: "user_1", name: "Budi Santoso", email: "budi@example.com" },
  ]);
});

describe("/member/admin/add-member", () => {
  test("renders the form for a leader", async () => {
    requireRole.mockResolvedValue({
      id: "user_1",
      name: "Budi Santoso",
      role: "leader",
    });

    render(await AddMemberPage());

    expect(requireRole).toHaveBeenCalledWith("leader");
    expect(
      screen.getByRole("heading", { level: 1, name: "Add Member" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  test("never renders for a non-leader — the guard redirects first", async () => {
    // requireRole calls next/navigation's redirect(), which throws; an agent
    // must be gone before the form (or the recruiter list) is ever built.
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AddMemberPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listRecruiterOptions).not.toHaveBeenCalled();
  });
});
