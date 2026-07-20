import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import MemberLayout from "../MemberLayout";

describe("MemberLayout", () => {
  test("renders children", () => {
    render(
      <MemberLayout>
        <p>Dashboard content</p>
      </MemberLayout>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  test("renders header and member nav landmarks with placeholder links", () => {
    render(
      <MemberLayout>
        <p>Dashboard content</p>
      </MemberLayout>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Member" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Started" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directory" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /account/i })).toBeInTheDocument();
  });
});
