import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("round-trips: hash then verify with the correct password succeeds", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(
      verifyPassword("correct-horse-battery-staple", hash)
    ).resolves.toBe(true);
  });

  it("fails verification with the wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(
      false
    );
  });
});
