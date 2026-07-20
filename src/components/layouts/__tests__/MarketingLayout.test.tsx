import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketingLayout from "../MarketingLayout";

describe("MarketingLayout", () => {
  test("renders children", () => {
    render(
      <MarketingLayout>
        <p>Page content</p>
      </MarketingLayout>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  test("renders header, primary nav, and footer landmarks", () => {
    render(
      <MarketingLayout>
        <p>Page content</p>
      </MarketingLayout>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  });
});
