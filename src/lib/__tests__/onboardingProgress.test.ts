import { beforeEach, describe, expect, test, vi } from "vitest";

const { findMany, upsert, deleteMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    onboardingProgress: { findMany, upsert, deleteMany },
  },
}));

import { getCompletedItemIds, setItemCompletion } from "@/lib/onboardingProgress";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCompletedItemIds", () => {
  test("returns just the itemId strings, scoped to the given user", async () => {
    findMany.mockResolvedValue([{ itemId: "know-yourself" }, { itemId: "learn" }]);

    const ids = await getCompletedItemIds("user_1");

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      select: { itemId: true },
    });
    expect(ids).toEqual(["know-yourself", "learn"]);
  });
});

describe("setItemCompletion", () => {
  test("completed: true upserts exactly one row", async () => {
    await setItemCompletion("user_1", "know-yourself", true);

    expect(upsert).toHaveBeenCalledWith({
      where: { userId_itemId: { userId: "user_1", itemId: "know-yourself" } },
      update: {},
      create: { userId: "user_1", itemId: "know-yourself" },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  test("completed: false deletes the row instead of upserting", async () => {
    await setItemCompletion("user_1", "know-yourself", false);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1", itemId: "know-yourself" },
    });
    expect(upsert).not.toHaveBeenCalled();
  });
});
