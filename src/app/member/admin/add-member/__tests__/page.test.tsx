import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireRole, listRecruiterOptionsFor, listPendingInvitesFor, listApplicantsFor } =
  vi.hoisted(() => ({
    requireRole: vi.fn(),
    listRecruiterOptionsFor: vi.fn(),
    listPendingInvitesFor: vi.fn(),
    listApplicantsFor: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ requireRole }));
vi.mock("@/lib/invites", async () => {
  // daysWaiting is pure and PendingInvites renders through it.
  const actual = await vi.importActual<typeof import("@/lib/invites")>(
    "@/lib/invites",
  );
  return { ...actual, listRecruiterOptionsFor, listPendingInvitesFor };
});
vi.mock("@/lib/applicant", () => ({ listApplicantsFor }));
vi.mock("../actions", () => ({ addMember: vi.fn(), setApplicantStatus: vi.fn() }));

import AddMemberPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  listRecruiterOptionsFor.mockResolvedValue([
    { id: "user_1", name: "Budi Santoso", email: "budi@example.com" },
  ]);
  listPendingInvitesFor.mockResolvedValue([]);
  listApplicantsFor.mockResolvedValue([]);
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

  test("shows the leader their branch's pending Join Us applicants", async () => {
    requireRole.mockResolvedValue({
      id: "user_1",
      name: "Budi Santoso",
      role: "leader",
    });
    listApplicantsFor.mockResolvedValue([
      {
        id: "applicant_1",
        status: "submitted",
        createdAt: new Date(),
        fullName: "Rani Putri",
        activeEmail: "rani@example.com",
        activePhone: "081234567890",
        birthPlace: "Jakarta",
        birthDate: "1998-05-10",
        address: "Jl. Sudirman No. 1",
        education: "s1",
        schoolName: "Universitas Indonesia",
        graduationYear: "2020",
        recruiterName: "Budi Santoso",
        ktpPhotoUrl: "https://signed.example/ktp",
        selfiePhotoUrl: null,
        familyCardPhotoUrl: null,
        savingsPhotoUrl: null,
        spousePhotoUrl: null,
      },
    ]);

    render(await AddMemberPage());

    expect(listApplicantsFor).toHaveBeenCalledWith("user_1");
    expect(
      screen.getByRole("heading", { level: 2, name: "Pendaftar dari Join Us" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rani Putri")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Foto KTP" })).toHaveAttribute(
      "href",
      "https://signed.example/ktp",
    );
  });

  test("never renders for a non-leader — the guard redirects first", async () => {
    // requireRole calls next/navigation's redirect(), which throws; an agent
    // must be gone before the form (or the recruiter list) is ever built.
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AddMemberPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(listRecruiterOptionsFor).not.toHaveBeenCalled();
    expect(listApplicantsFor).not.toHaveBeenCalled();
    expect(listPendingInvitesFor).not.toHaveBeenCalled();
  });
});
