import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Supabase redirects here with a PKCE `code` after Google sign-in
// completes; exchanging it for a session sets the auth cookies proxy.ts
// then reads on the next request to /member.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
}

/**
 * Where to land after sign-in. `next` is a generic mechanism (any caller can
 * pass one through /login) rather than something special-cased to one flow,
 * so it's attacker-reachable: only same-origin *paths* are honoured, and
 * anything else falls back to /member. "//evil.com" and "/\evil.com" are
 * rejected too — both are protocol-relative URLs despite the leading slash.
 */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/member";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/member";
  return next;
}
