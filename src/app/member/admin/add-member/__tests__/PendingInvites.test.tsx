import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PendingInvites, { waitingLabel } from "../PendingInvites";

const createdAt = new Date("2026-07-20T09:00:00Z");

const invite = {
  id: "invite_1",
  email: "baru@example.com",
  role: "agent" as const,
  createdAt,
  recruiterName: "Rani Putri",
  invitedByName: "Budi Santoso",
  invitedByYou: true,
};

beforeEach(() => {
  // daysWaiting reads the clock at render time.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-23T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("waitingLabel", () => {
  test("reads naturally at every count", () => {
    expect(waitingLabel(0)).toBe("Diundang hari ini");
    expect(waitingLabel(1)).toBe("Nunggu 1 hari");
    expect(waitingLabel(9)).toBe("Nunggu 9 hari");
  });
});

describe("PendingInvites", () => {
  test("says so plainly when nobody is waiting", () => {
    render(<PendingInvites invites={[]} />);

    expect(screen.getByText(/Nggak ada undangan yang lagi nunggu/i)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  test("lists an invite with its role, recruiter, and days waiting", () => {
    render(<PendingInvites invites={[invite]} />);

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("baru@example.com")).toBeInTheDocument();
    expect(within(row).getByText(/Agent · Recruiter: Rani Putri/)).toBeInTheDocument();
    expect(within(row).getByText("Nunggu 3 hari")).toBeInTheDocument();
  });

  test("names the inviter only when it wasn't the viewing leader", () => {
    render(
      <PendingInvites
        invites={[
          { ...invite, invitedByYou: false, invitedByName: "Sari Dewi" },
        ]}
      />,
    );

    expect(screen.getByText(/Diundang Sari Dewi/)).toBeInTheDocument();
  });

  test("does not repeat the viewing leader's own name on every row", () => {
    render(<PendingInvites invites={[invite]} />);

    expect(screen.queryByText(/Diundang Budi Santoso/)).not.toBeInTheDocument();
  });

  test("falls back to a dash when the recruiter row is gone", () => {
    render(<PendingInvites invites={[{ ...invite, recruiterName: null }]} />);

    expect(screen.getByText(/Recruiter: —/)).toBeInTheDocument();
  });
});
