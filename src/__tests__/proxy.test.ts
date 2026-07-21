import { describe, expect, it, vi } from "vitest";

// proxy.ts's default export builds a Supabase client and a Prisma lookup,
// which need real credentials/a DB connection — this test only exercises
// the pure redirect decision, so both are mocked out rather than connected
// to (same pattern as the pre-Supabase proxy.ts test).
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { decideProxyResponse } from "@/proxy";

function urlFor(pathname: string) {
  return new URL(`https://example.com${pathname}`);
}

describe("decideProxyResponse", () => {
  it("redirects an unauthenticated request to /member/x to /login", () => {
    const response = decideProxyResponse("unauthenticated", urlFor("/member/x"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://example.com/login"
    );
  });

  it("redirects an authenticated-but-no-profile request to /member/x to /not-invited", () => {
    const response = decideProxyResponse("no-profile", urlFor("/member/x"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://example.com/not-invited"
    );
  });

  it("passes through an authenticated request to /member/x", () => {
    const response = decideProxyResponse("authenticated", urlFor("/member/x"));
    expect(response).toBeUndefined();
  });

  it("passes through unauthenticated requests outside /member", () => {
    const response = decideProxyResponse("unauthenticated", urlFor("/login"));
    expect(response).toBeUndefined();
  });
});
