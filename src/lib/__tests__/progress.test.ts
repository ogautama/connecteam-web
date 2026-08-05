import { describe, expect, test } from "vitest";
import { summarizeProgress } from "@/lib/progress";

describe("summarizeProgress", () => {
  test("counts only ids present in both lists", () => {
    const result = summarizeProgress(
      ["a", "b", "c", "d"],
      new Set(["b", "d", "not-in-list"])
    );
    expect(result).toEqual({ completed: 2, total: 4, percent: 50 });
  });

  test("rounds to the nearest whole percent", () => {
    const result = summarizeProgress(["a", "b", "c"], new Set(["a"]));
    expect(result).toEqual({ completed: 1, total: 3, percent: 33 });
  });

  test("zero total is 0%, not NaN or a divide-by-zero throw", () => {
    expect(summarizeProgress([], new Set())).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
    });
  });

  test("nothing completed is 0%, everything completed is 100%", () => {
    expect(summarizeProgress(["a", "b"], new Set())).toMatchObject({
      percent: 0,
    });
    expect(summarizeProgress(["a", "b"], new Set(["a", "b"]))).toMatchObject({
      percent: 100,
    });
  });
});
