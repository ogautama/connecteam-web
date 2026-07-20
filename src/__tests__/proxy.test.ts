import { describe, expect, it, vi } from "vitest";

// proxy.ts's default export wires up next-auth's `auth()`, which needs a
// real Prisma connection — this test only exercises the pure redirect
// decision, so the DB layer is mocked out rather than connected to.
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { decideProxyResponse } from "@/proxy";

function urlFor(pathname: string) {
  return new URL(`https://example.com${pathname}`);
}

describe("decideProxyResponse", () => {
  it("redirects unauthenticated requests to /member/x to /login", () => {
    const response = decideProxyResponse(false, urlFor("/member/x"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://example.com/login"
    );
  });

  it("passes through authenticated requests to /member/x", () => {
    const response = decideProxyResponse(true, urlFor("/member/x"));
    expect(response).toBeUndefined();
  });

  it("passes through unauthenticated requests outside /member", () => {
    const response = decideProxyResponse(false, urlFor("/login"));
    expect(response).toBeUndefined();
  });
});
