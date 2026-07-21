import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole, createPendingInvite, resolveInviteRecruiter } = vi.hoisted(
  () => ({
    requireRole: vi.fn(),
    createPendingInvite: vi.fn(),
    resolveInviteRecruiter: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({ requireRole }));
vi.mock("@/lib/invites", async () => {
  // isValidEmail/normalizeEmail are pure — exercise the real ones.
  const actual = await vi.importActual<typeof import("@/lib/invites")>(
    "@/lib/invites",
  );
  return { ...actual, createPendingInvite, resolveInviteRecruiter };
});

import { addMember, type AddMemberState } from "../actions";

const idle: AddMemberState = { status: "idle" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: "user_1", name: "Budi", role: "leader" });
  resolveInviteRecruiter.mockResolvedValue("user_2");
  createPendingInvite.mockResolvedValue({ ok: true, invite: { id: "invite_1" } });
});

describe("addMember", () => {
  it("rejects an empty email before touching the database", async () => {
    const state = await addMember(idle, form({ email: "   " }));

    expect(state).toEqual({ status: "error", message: "Email wajib diisi." });
    expect(createPendingInvite).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before touching the database", async () => {
    const state = await addMember(idle, form({ email: "rani@gmail" }));

    expect(state).toEqual({
      status: "error",
      message: "Format emailnya belum bener.",
    });
    expect(createPendingInvite).not.toHaveBeenCalled();
  });

  it("creates the invite with the acting leader as invitedBy", async () => {
    const state = await addMember(
      idle,
      form({
        email: " Rani@Gmail.com ",
        recruiterId: "user_2",
        inviteCode: "",
        role: "leader",
      }),
    );

    expect(resolveInviteRecruiter).toHaveBeenCalledWith({
      recruiterId: "user_2",
      inviteCode: undefined,
    });
    expect(createPendingInvite).toHaveBeenCalledWith({
      email: "Rani@Gmail.com",
      recruiterId: "user_2",
      role: "leader",
      invitedBy: "user_1",
    });
    expect(state).toEqual({ status: "success", email: "rani@gmail.com" });
  });

  it("defaults an unrecognized role to agent", async () => {
    await addMember(idle, form({ email: "rani@gmail.com", role: "admin" }));

    expect(createPendingInvite).toHaveBeenCalledWith(
      expect.objectContaining({ role: "agent" }),
    );
  });

  it("returns an inline error for an email that already has an account", async () => {
    createPendingInvite.mockResolvedValue({ ok: false, reason: "existing-user" });

    const state = await addMember(idle, form({ email: "rani@gmail.com" }));

    expect(state).toEqual({
      status: "error",
      message: "Email ini udah punya akun. Nggak perlu diundang lagi.",
    });
  });

  it("returns an inline error for an email that is already invited", async () => {
    createPendingInvite.mockResolvedValue({
      ok: false,
      reason: "existing-invite",
    });

    const state = await addMember(idle, form({ email: "rani@gmail.com" }));

    expect(state).toEqual({
      status: "error",
      message: "Email ini udah diundang dan tinggal nunggu dia sign in.",
    });
  });

  it("re-checks the leader role — the action is reachable by direct POST", async () => {
    // requireRole redirects (throws) for anyone else; the action must not
    // swallow that and fall through to creating an invite.
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(addMember(idle, form({ email: "rani@gmail.com" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(createPendingInvite).not.toHaveBeenCalled();
  });
});
