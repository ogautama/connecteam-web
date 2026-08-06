import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, createSupabaseServerClient } = vi.hoisted(() => {
  const exchangeCodeForSession = vi.fn();
  return {
    exchangeCodeForSession,
    createSupabaseServerClient: vi.fn(async () => ({
      auth: { exchangeCodeForSession },
    })),
  };
});

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient }));

import { GET } from "../route";

function callbackUrl(query: string) {
  return new Request(`https://app.example${query}`);
}

async function destinationOf(query: string): Promise<string | null> {
  const response = await GET(callbackUrl(query));
  return response.headers.get("location");
}

beforeEach(() => {
  vi.clearAllMocks();
  exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
});

describe("/auth/callback", () => {
  it("exchanges the PKCE code and lands on /member by default", async () => {
    expect(await destinationOf("/auth/callback?code=abc123")).toBe(
      "https://app.example/member",
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
  });

  it("honours a same-origin `next` path", async () => {
    expect(
      await destinationOf("/auth/callback?code=abc123&next=%2Fmember%2Fprofile"),
    ).toBe("https://app.example/member/profile");
  });

  it("skips the exchange when there's no code, but still redirects", async () => {
    expect(await destinationOf("/auth/callback")).toBe("https://app.example/member");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it.each([
    ["https://evil.example/steal", "an absolute URL"],
    ["//evil.example/steal", "a protocol-relative URL"],
    ["/\\evil.example/steal", "a backslash protocol-relative URL"],
    ["member/profile", "a bare relative path"],
    ["", "an empty value"],
  ])("falls back to /member for %s (%s)", async (next) => {
    expect(
      await destinationOf(`/auth/callback?code=abc123&next=${encodeURIComponent(next)}`),
    ).toBe("https://app.example/member");
  });
});
