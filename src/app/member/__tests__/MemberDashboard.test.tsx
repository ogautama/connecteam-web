import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MemberDashboard, { firstNameOf } from "../MemberDashboard";

const agent = {
  id: "user_1",
  name: "Rani Putri",
  email: "rani@example.com",
  role: "agent" as const,
};

const inviteCode = "cku7test9df2";

describe("firstNameOf", () => {
  test("greets people by first name only", () => {
    expect(firstNameOf("Rani Putri Wijaya")).toBe("Rani");
  });

  test("handles a single-word name", () => {
    expect(firstNameOf("Rani")).toBe("Rani");
  });
});

describe("MemberDashboard", () => {
  test("welcomes the logged-in user by first name", () => {
    render(<MemberDashboard user={agent} inviteCode={inviteCode} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Halo, Rani" }),
    ).toBeInTheDocument();
  });

  test("renders the announcement banner and the events placeholder", () => {
    render(<MemberDashboard user={agent} inviteCode={inviteCode} />);

    expect(
      screen.getByRole("heading", { name: /Member space baru udah live/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acara Terdekat" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Belum ada acara yang dijadwalin/i)).toBeInTheDocument();
  });

  test("renders the DISC referral link built from the member's inviteCode", () => {
    render(<MemberDashboard user={agent} inviteCode={inviteCode} />);

    expect(
      screen.getByRole("heading", { name: "Link tes DISC kamu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`/tools/disc?ref=${inviteCode}`, { exact: false }),
    ).toBeInTheDocument();
  });

  test("quick-links to the top-level sections only — no Calculator, no children", () => {
    render(<MemberDashboard user={agent} inviteCode={inviteCode} />);

    const sections = screen
      .getByRole("heading", { name: "Menu" })
      .parentElement!;
    const links = within(sections).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/member/onboarding",
      "/member/onboarding?section=recruiting",
      "/member/onboarding?section=selling",
      "/member/onboarding?section=references",
      "/member/onboarding?section=directory",
    ]);
  });

  test("excludes Add Member from the dashboard even for a leader", () => {
    render(
      <MemberDashboard user={{ ...agent, role: "leader" }} inviteCode={inviteCode} />,
    );

    const sections = screen
      .getByRole("heading", { name: "Menu" })
      .parentElement!;

    expect(
      within(sections).queryByRole("link", { name: /Add Member/ }),
    ).not.toBeInTheDocument();
  });
});
