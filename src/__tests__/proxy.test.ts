// @vitest-environment node
//
// Not jsdom (this repo's default): NextResponse.next({ request }) requires a
// genuine Headers instance, and jsdom's global shadows the one Next checks
// against. proxy.ts is server-only code anyway.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// proxy.ts's default export builds a Supabase client and a Prisma lookup,
// which need real credentials/a DB connection — the decideProxyResponse
// tests only exercise the pure redirect decision, so both are mocked out
// rather than connected to (same pattern as the pre-Supabase proxy.ts test).
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));

// The default export's job is cookie plumbing, so the fake client below
// stands in for the real one: `getUser` pushes a refreshed cookie through
// the `setAll` adapter exactly like a token rotation would, then reports
// whichever user the test asked for.
const { createServerClient, getUserResult } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUserResult: { user: null as { id: string } | null },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClient.mockImplementation(
    (_url: string, _key: string, options: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options?: object }[]
        ) => void;
      };
    }) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll([
            {
              name: "sb-test-auth-token",
              value: "rotated",
              options: { path: "/" },
            },
          ]);
          return { data: { user: getUserResult.user } };
        },
      },
    })
  ),
}));

import proxy, { decideProxyResponse } from "@/proxy";

function urlFor(pathname: string) {
  return new URL(`https://example.com${pathname}`);
}

/** A request already carrying a (stale) Supabase session cookie. */
function signedInRequest(pathname: string) {
  const request = new NextRequest(urlFor(pathname));
  request.cookies.set("sb-test-auth-token", "stale");
  return request;
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

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserResult.user = { id: "user-1" };
    findUnique.mockResolvedValue({ id: "user-1" });
  });

  it("refreshes the session on public pages, where a render can't write cookies", async () => {
    const response = await proxy(signedInRequest("/"));

    // The rotation has to land on a real response here — the marketing pages
    // call getCurrentUser() during render, and that render's own cookie write
    // is swallowed (see supabase-server.ts).
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated");
  });

  it("doesn't spend a profile query outside /member", async () => {
    await proxy(signedInRequest("/join"));

    expect(findUnique).not.toHaveBeenCalled();
  });

  it("carries refreshed cookies onto a redirect instead of dropping them", async () => {
    findUnique.mockResolvedValue(null); // signed in, never invited

    const response = await proxy(signedInRequest("/member"));

    expect(response.headers.get("location")).toBe(
      "https://example.com/not-invited"
    );
    // Dropping these is the bug: Supabase has already revoked the old refresh
    // token, so a redirect without them signs the member out for real.
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotated");
  });

  it("skips both round trips when no session cookie is present", async () => {
    const response = await proxy(new NextRequest(urlFor("/")));

    expect(createServerClient).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("still gates /member when no session cookie is present", async () => {
    const response = await proxy(new NextRequest(urlFor("/member")));

    expect(createServerClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://example.com/login");
  });
});
