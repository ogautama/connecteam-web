import { beforeEach, describe, expect, it, vi } from "vitest";

const { createLead, getCurrentUser, resolveRecruiter } = vi.hoisted(() => ({
  createLead: vi.fn().mockResolvedValue({ id: "lead_1" }),
  getCurrentUser: vi.fn(),
  resolveRecruiter: vi.fn(),
}));

vi.mock("@/lib/leads", () => ({ createLead }));
vi.mock("@/lib/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/recruitTree", () => ({ resolveRecruiter }));

import { saveDiscLead } from "../actions";
import { DISC_QUESTIONS } from "@/lib/disc/questions";

const answers = DISC_QUESTIONS.map((q) => q.statements[0].trait);

beforeEach(() => {
  vi.clearAllMocks();
  createLead.mockResolvedValue({ id: "lead_1" });
  getCurrentUser.mockResolvedValue(null);
  resolveRecruiter.mockResolvedValue("root_user");
});

describe("saveDiscLead attribution", () => {
  it("anonymous + a valid ref: owner resolves through resolveRecruiter, no taker", async () => {
    resolveRecruiter.mockResolvedValue("leader_user");

    await saveDiscLead({ name: "Sinta", contact: "0812", answers, ref: "code123" });

    expect(resolveRecruiter).toHaveBeenCalledWith("code123");
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "leader_user", takerUserId: undefined }),
    );
  });

  it("anonymous + no ref: falls back to root via resolveRecruiter(undefined)", async () => {
    await saveDiscLead({ name: "Sinta", contact: "0812", answers });

    expect(resolveRecruiter).toHaveBeenCalledWith(undefined);
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "root_user", takerUserId: undefined }),
    );
  });

  it("anonymous + an unknown ref: resolveRecruiter's own fallback still applies", async () => {
    // resolveRecruiter already treats an unknown code as "root" — this
    // action doesn't special-case it, just passes the code through.
    await saveDiscLead({ name: "Sinta", contact: "0812", answers, ref: "garbage" });

    expect(resolveRecruiter).toHaveBeenCalledWith("garbage");
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "root_user" }),
    );
  });

  it("signed-in: owner and taker are both the session user, ref ignored, resolveRecruiter not called", async () => {
    getCurrentUser.mockResolvedValue({
      id: "member_1",
      name: "Budi",
      email: "budi@example.com",
      role: "agent",
    });

    await saveDiscLead({
      name: "Budi",
      contact: "budi@example.com",
      answers,
      ref: "someone-elses-code",
    });

    expect(resolveRecruiter).not.toHaveBeenCalled();
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "member_1", takerUserId: "member_1" }),
    );
  });
});
