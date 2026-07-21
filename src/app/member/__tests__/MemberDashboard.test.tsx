import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MemberDashboard, { firstNameOf } from "../MemberDashboard";

const agent = { id: "user_1", name: "Rani Putri", role: "agent" as const };

describe("firstNameOf", () => {
  test("greets people by first name only", () => {
    expect(firstNameOf("Rani Putri Wijaya")).toBe("Rani");
  });

  test("handles a single-word name", () => {
    expect(firstNameOf("Rani")).toBe("Rani");
  });
});

describe("MemberDashboard", () => {
  test("welcomes the logged-in user by name", () => {
    render(<MemberDashboard user={agent} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back, Rani" }),
    ).toBeInTheDocument();
  });

  test("renders the announcement banner and the events placeholder", () => {
    render(<MemberDashboard user={agent} />);

    expect(
      screen.getByRole("heading", { name: /new member space is live/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Upcoming events" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No events scheduled yet/i)).toBeInTheDocument();
  });

  test("quick-links to all 8 sections", () => {
    render(<MemberDashboard user={agent} />);

    const sections = screen
      .getByRole("heading", { name: "Sections" })
      .parentElement!;
    const links = within(sections).getAllByRole("link");

    expect(links).toHaveLength(8);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/member/onboarding",
      "/member/grow",
      "/member/sell",
      "/member/reference",
      "/member/systems",
      "/member/contests",
      "/member/events",
      "/member/directory",
    ]);
  });
});
