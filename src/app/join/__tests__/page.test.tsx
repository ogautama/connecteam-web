import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import JoinPage from "../page";

describe("Join page", () => {
  test("renders the embedded Google Form", () => {
    render(<JoinPage />);

    const iframe = screen.getByTitle("Form pendaftaran CONNECTeam");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining("docs.google.com/forms/"),
    );
  });
});
