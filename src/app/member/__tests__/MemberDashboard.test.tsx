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
  test("welcomes the logged-in user by first name", () => {
    render(<MemberDashboard user={agent} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Halo, Rani" }),
    ).toBeInTheDocument();
  });

  test("renders the announcement banner and the events placeholder", () => {
    render(<MemberDashboard user={agent} />);

    expect(
      screen.getByRole("heading", { name: /Member space baru udah live/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Acara Terdekat" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Belum ada acara yang dijadwalin/i)).toBeInTheDocument();
  });

  test("quick-links to all 8 sections", () => {
    render(<MemberDashboard user={agent} />);

    const sections = screen
      .getByRole("heading", { name: "Menu" })
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
