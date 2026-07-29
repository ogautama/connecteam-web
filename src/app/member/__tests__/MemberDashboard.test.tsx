import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MemberDashboard, { firstNameOf } from "../MemberDashboard";

const agent = {
  id: "user_1",
  name: "Rani Putri",
  email: "rani@example.com",
  role: "agent" as const,
};

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

  test("quick-links to every section, nested ones included", () => {
    render(<MemberDashboard user={agent} />);

    const sections = screen
      .getByRole("heading", { name: "Menu" })
      .parentElement!;
    const links = within(sections).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/member/onboarding",
      "/member/onboarding?section=onboarding-join",
      "/member/onboarding?section=onboarding-pruforce",
      "/member/onboarding?section=onboarding-lisensi",
      "/member/onboarding?section=onboarding-mfc",
      "/member/onboarding?section=onboarding-kenali-dirimu",
      "/member/onboarding?section=onboarding-goals",
      "/member/onboarding?section=onboarding-setup-wa-ig",
      "/member/onboarding?section=recruiting",
      "/member/onboarding?section=recruiting-why",
      "/member/onboarding?section=recruiting-bank-fast",
      "/member/onboarding?section=recruiting-presentasi",
      "/member/onboarding?section=recruiting-handling-obj",
      "/member/onboarding?section=selling",
      "/member/onboarding?section=selling-learning-center",
      "/member/onboarding?section=selling-bank-form",
      "/member/onboarding?section=selling-sales-tools",
      "/member/onboarding?section=calculator",
      "/member/onboarding?section=references",
      "/member/onboarding?section=references-recording",
      "/member/onboarding?section=references-commission",
      "/member/onboarding?section=references-prestige",
      "/member/onboarding?section=references-schedule-book",
      "/member/onboarding?section=references-prupay-link",
      "/member/onboarding?section=references-claim",
      "/member/onboarding?section=references-contests",
      "/member/onboarding?section=references-events",
      "/member/onboarding?section=directory",
      "/member/onboarding?section=directory-yellow-pages",
      "/member/onboarding?section=directory-who-is-prudential",
      "/member/onboarding?section=directory-who-is-mrt",
      "/member/onboarding?section=directory-who-is-connecteam",
    ]);
  });

  test("gives a leader the Add Member card too", () => {
    render(<MemberDashboard user={{ ...agent, role: "leader" }} />);

    const sections = screen
      .getByRole("heading", { name: "Menu" })
      .parentElement!;

    expect(
      within(sections).getByRole("link", { name: /Add Member/ }),
    ).toHaveAttribute("href", "/member/admin/add-member");
  });
});
