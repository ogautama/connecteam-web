import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireRole, listRecruiterOptionsFor, listPendingInvitesFor } = vi.hoisted(
  () => ({
    requireRole: vi.fn(),
    listRecruiterOptionsFor: vi.fn(),
    listPendingInvitesFor: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({ requireRole }));
vi.mock("@/lib/invites", async () => {
  // daysWaiting is pure and PendingInvites renders through it.
  const actual = await vi.importActual<typeof import("@/lib/invites")>(
    "@/lib/invites",
  );
  return { ...actual, listRecruiterOptionsFor, listPendingInvitesFor };
});
vi.mock("../actions", () => ({ addMember: vi.fn() }));

import AddMemberPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  listRecruiterOptionsFor.mockResolvedValue([
    { id: "user_1", name: "Budi Santoso", email: "budi@example.com" },
  ]);
  listPendingInvitesFor.mockResolvedValue([]);
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

  test("shows the leader their branch's outstanding invites", async () => {
    requireRole.mockResolvedValue({
      id: "user_1",
      name: "Budi Santoso",
      role: "leader",
    });
    listPendingInvitesFor.mockResolvedValue([
      {
        id: "invite_1",
        email: "baru@example.com",
        role: "agent",
        createdAt: new Date(),
        recruiterName: "Rani Putri",
        invitedByName: "Budi Santoso",
        invitedByYou: true,
      },
    ]);

    render(await AddMemberPage());

    expect(listPendingInvitesFor).toHaveBeenCalledWith("user_1");
    expect(
      screen.getByRole("heading", { level: 2, name: "Belum Login" }),
    ).toBeInTheDocument();
    expect(screen.getByText("baru@example.com")).toBeInTheDocument();
  });

  test("never renders for a non-leader — the guard redirects first", async () => {
    // requireRole calls next/navigation's redirect(), which throws; an agent
    // must be gone before the form (or the recruiter list) is ever built.
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AddMemberPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listRecruiterOptionsFor).not.toHaveBeenCalled();
    expect(listPendingInvitesFor).not.toHaveBeenCalled();
  });
});
